import { prisma } from '@libs/prisma';
import { AppError, ErrorAppCode, parsePrismaError } from '@utils/errorHandler';
import { 
  ManhwaEntity, 
  CreateManhwaDto,
  SearchParams,
  SearchResponse,
  ManhwaSearchResult
} from '../types/manhwa';
import * as mangadexService from './mangadexService';
import * as searchService from './manhwaSearchService';
import * as cache from '@utils/cache';
import { requestCoalescer } from '@utils/requestCoalescer';

// Helper functions
const parseManhwaEntity = (raw: any): ManhwaEntity => {
  return {
    ...raw,
    titleData: raw.titleData as any,
    specialChapters: raw.specialChapters as any,
    genres: raw.genres?.map((g: any) => ({
      genre: g.genre
    }))
  };
};

const shouldRefresh = (manhwa: any): boolean => {
  // Local entries never need refresh
  if (manhwa.dataSource === 'LOCAL') return false;
  
  // No sync date means it needs refresh
  if (!manhwa.lastSyncedAt) return true;
  
  // Refresh if older than 24 hours
  const hoursSinceSync = (Date.now() - manhwa.lastSyncedAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceSync > 24;
};

// Search manhwa with caching and external fallback
export const searchManhwa = async (params: SearchParams): Promise<SearchResponse> => {
  const cacheKey = cache.generateSearchCacheKey(params);
  
  // Check cache first
  const cached = await cache.getSearchCache<SearchResponse>(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    // Use request coalescer to prevent duplicate searches
    const result = await requestCoalescer.coalesce(
      cacheKey,
      async () => {
        const startTime = Date.now();
        
        // Always search local first
        let response = await searchService.searchManhwaFullText(params);
        
        // If no local results and external search enabled, try Mangadex
        if (response.results.length === 0 && params.includeExternal) {
          try {
            const externalResults = await searchMangadexWithMapping(params);
            response = {
              results: externalResults,
              pagination: {
                currentPage: params.pagination.page,
                totalPages: 1, // External search doesn't paginate same way
                totalResults: externalResults.length
              },
              metadata: {
                sourcesQueried: ['local', 'mangadex'],
                queryTime: Date.now() - startTime
              }
            };
          } catch (error) {
            console.error('External search failed:', error);
            // Continue with empty local results
            response.metadata.sourcesQueried.push('mangadex (failed)');
          }
        }
        
        response.metadata.queryTime = Date.now() - startTime;
        
        // Cache successful results
        await cache.setSearchCache(cacheKey, response);
        
        return response;
      }
    );
    
    return result;
  } catch (error) {
    throw parsePrismaError(error);
  }
};

// Get single manhwa with smart refresh
export const getManhwaById = async (
  id: number, 
  forceRefresh = false
): Promise<ManhwaEntity> => {
  const cacheKey = `manhwa:entity:${id}`;
  
  // Check cache unless forcing refresh
  if (!forceRefresh) {
    const cached = await cache.getEntityCache<ManhwaEntity>(cacheKey);
    if (cached) {
      // Check if background refresh needed
      if (shouldRefresh(cached) && cached.mangadexId) {
        // Trigger background refresh without blocking
        refreshInBackground(id, cached.mangadexId);
      }
      return cached;
    }
  }
  
  try {
    const manhwa = await prisma.manhwa.findUnique({
      where: { id },
      include: {
        genres: { include: { genre: true } }
      }
    });
    
    if (!manhwa) {
      throw new AppError(
        'Manhwa not found',
        404,
        ErrorAppCode.ManhwaNotFound
      );
    }
    
    // Force refresh if requested or needed
    if ((forceRefresh || shouldRefresh(manhwa)) && manhwa.mangadexId) {
      try {
        await syncFromMangadex(id, manhwa.mangadexId);
        // Re-fetch updated data
        const updated = await prisma.manhwa.findUnique({
          where: { id },
          include: {
            genres: { include: { genre: true } }
          }
        });
        if (updated) {
          const parsed = parseManhwaEntity(updated);
          await cache.setEntityCache(cacheKey, parsed);
          return parsed;
        }
      } catch (error) {
        console.error(`Sync failed for manhwa ${id}:`, error);
        // Continue with stale data
      }
    }
    
    const parsed = parseManhwaEntity(manhwa);
    await cache.setEntityCache(cacheKey, parsed);
    
    return parsed;
  } catch (error) {
    throw parsePrismaError(error);
  }
};

// Create new manhwa entry
export const createManhwa = async (data: CreateManhwaDto): Promise<ManhwaEntity> => {
  try {
    // Validate genres exist
    if (data.genres?.length) {
      const validGenres = await prisma.genre.findMany({
        where: { slug: { in: data.genres } }
      });
      
      if (validGenres.length !== data.genres.length) {
        const foundSlugs = validGenres.map(g => g.slug);
        const invalid = data.genres.filter(g => !foundSlugs.includes(g));
        throw new AppError(
          `Invalid genres: ${invalid.join(', ')}`,
          400,
          ErrorAppCode.BadInput
        );
      }
    }
    
    const manhwa = await prisma.manhwa.create({
      data: {
        dataSource: 'LOCAL',
        titleData: data.title,
        synopsis: data.synopsis,
        status: data.status,
        publisher: data.publisher,
        totalChapters: data.totalChapters,
        genres: {
          create: data.genres?.map(genreSlug => ({
            genre: {
              connect: { slug: genreSlug }
            }
          })) || []
        }
      },
      include: {
        genres: { include: { genre: true } }
      }
    });
    
    const parsed = parseManhwaEntity(manhwa);
    
    // Invalidate search cache since new data added
    cache.invalidatePattern('search:');
    
    return parsed;
  } catch (error) {
    throw parsePrismaError(error);
  }
};

// Bulk fetch with intelligent caching
export const getManhwaByIds = async (
  ids: number[]
): Promise<Record<number, ManhwaEntity>> => {
  const results: Record<number, ManhwaEntity> = {};
  const uncachedIds: number[] = [];
  
  // Check cache for each ID
  for (const id of ids) {
    const cached = await cache.getEntityCache<ManhwaEntity>(`manhwa:entity:${id}`);
    if (cached) {
      results[id] = cached;
    } else {
      uncachedIds.push(id);
    }
  }
  
  // Fetch uncached in single query
  if (uncachedIds.length > 0) {
    try {
      const entities = await prisma.manhwa.findMany({
        where: { id: { in: uncachedIds } },
        include: {
          genres: { include: { genre: true } }
        }
      });
      
      // Parse and cache each entity
      await Promise.all(
        entities.map(async (entity) => {
          const parsed = parseManhwaEntity(entity);
          results[entity.id] = parsed;
          await cache.setEntityCache(`manhwa:entity:${entity.id}`, parsed);
        })
      );
    } catch (error) {
      throw parsePrismaError(error);
    }
  }
  
  return results;
};

// Sync from Mangadex with detailed error handling
export const syncFromMangadex = async (
  id: number,
  mangadexId: string
): Promise<{
  status: 'success' | 'failed';
  message: string;
  lastSyncedAt?: Date;
}> => {
  try {
    // Fetch fresh data from Mangadex
    const mangadexData = await mangadexService.getMangadexById(mangadexId);
    const transformed = mangadexService.transformMangadexData(mangadexData);
    
    // Get cover URLs
    const covers = {
      coverThumbnail: mangadexService.getMangadexCoverUrl(mangadexData, 'thumb'),
      coverMedium: mangadexService.getMangadexCoverUrl(mangadexData, 'medium'),
      coverLarge: mangadexService.getMangadexCoverUrl(mangadexData, 'large')
    };
    
    // Update with new data (exclude id field)
    const { id: _id, ...updateData } = transformed;
    await prisma.manhwa.update({
      where: { id },
      data: {
        ...updateData,
        ...covers,
        lastSyncedAt: new Date(),
        syncStatus: 'CURRENT',
        version: { increment: 1 }
      } as any
    });
    
    // Invalidate caches
    cache.invalidatePattern(`manhwa:entity:${id}`);
    
    return {
      status: 'success',
      message: 'Successfully synced from Mangadex',
      lastSyncedAt: new Date()
    };
  } catch (error) {
    // Mark as failed in database
    await prisma.manhwa.update({
      where: { id },
      data: { syncStatus: 'FAILED' }
    });
    
    // Determine error type
    let message = 'Sync failed';
    if (error instanceof AppError) {
      if (error.appCode === ErrorAppCode.ManhwaNotFound) {
        message = 'Manga no longer exists on Mangadex';
      } else if (error.appCode === ErrorAppCode.RateLimitExceeded) {
        message = 'Rate limit exceeded. Please try again later';
      }
    }
    
    throw new AppError(
      message,
      500,
      ErrorAppCode.SyncFailed,
      error
    );
  }
};

// Background refresh without blocking
const refreshInBackground = async (id: number, mangadexId: string) => {
  try {
    await syncFromMangadex(id, mangadexId);
    console.log(`Background refresh completed for manhwa ${id}`);
  } catch (error) {
    console.error(`Background refresh failed for manhwa ${id}:`, error);
  }
};

// Search Mangadex with genre mapping
const searchMangadexWithMapping = async (
  params: SearchParams
): Promise<ManhwaSearchResult[]> => {
  // Get tag mappings from cache or fetch
  let tagMappings = await cache.getTagCache<any>('mangadex:tags');
  if (!tagMappings) {
    try {
      const tags = await mangadexService.getMangadexTags();
      tagMappings = tags.reduce((acc, tag) => {
        acc[tag.name.toLowerCase()] = tag.id;
        return acc;
      }, {} as any);
      await cache.setTagCache('mangadex:tags', tagMappings);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
      tagMappings = {};
    }
  }
  
  // Map our genre slugs to Mangadex tag UUIDs
  const tagIds = params.filters?.genres?.map(
    genre => tagMappings[genre.replace('-', ' ')]
  ).filter(Boolean) || [];
  
  // Search with mapped parameters
  const response = await mangadexService.searchMangadex(params.query, {
    limit: params.pagination.limit,
    offset: (params.pagination.page - 1) * params.pagination.limit,
    status: params.filters?.status,
    tags: tagIds.length > 0 ? tagIds : undefined
  });
  
  // Transform results
  return response.data.map(manga => {
    const titleData = mangadexService.transformMangadexData(manga).titleData!;
    const genres = manga.attributes.tags
      .filter(tag => tag.attributes.group === 'genre')
      .map(tag => tag.attributes.name.en || Object.values(tag.attributes.name)[0]);
    
    return {
      id: 0, // External results don't have local IDs
      title: titleData.primary,
      coverThumbnail: mangadexService.getMangadexCoverUrl(manga, 'thumb'),
      synopsis: (manga.attributes.description.en || 
                manga.attributes.description.ko ||
                Object.values(manga.attributes.description)[0] || 
                'No description available.').substring(0, 200) + '...',
      status: manga.attributes.status,
      totalChapters: undefined,
      genres
    };
  });
};

// Import Korean manhwa from Mangadex (validates Korean content)
export const importFromMangadex = async (
  mangadexId: string
): Promise<ManhwaEntity> => {
  try {
    // Check if already exists
    const existing = await prisma.manhwa.findUnique({
      where: { mangadexId }
    });
    
    if (existing) {
      throw new AppError(
        'This Korean manhwa is already in the database',
        400,
        ErrorAppCode.BadInput
      );
    }
    
    // Fetch from Mangadex
    const mangadexData = await mangadexService.getMangadexById(mangadexId);
    const transformed = mangadexService.transformMangadexData(mangadexData);
    
    // Get covers
    const covers = {
      coverThumbnail: mangadexService.getMangadexCoverUrl(mangadexData, 'thumb'),
      coverMedium: mangadexService.getMangadexCoverUrl(mangadexData, 'medium'),
      coverLarge: mangadexService.getMangadexCoverUrl(mangadexData, 'large')
    };
    
    // Create new entry (exclude id field)
    const { id: _id, ...createData } = transformed;
    const manhwa = await prisma.manhwa.create({
      data: {
        ...createData,
        ...covers,
        lastSyncedAt: new Date(),
        syncStatus: 'CURRENT'
      } as any,
      include: {
        genres: { include: { genre: true } }
      }
    });
    
    return parseManhwaEntity(manhwa);
  } catch (error) {
    throw parsePrismaError(error);
  }
};

// Get all available genres
export const getAllGenres = async () => {
  try {
    return await prisma.genre.findMany({
      orderBy: { name: 'asc' }
    });
  } catch (error) {
    throw parsePrismaError(error);
  }
};