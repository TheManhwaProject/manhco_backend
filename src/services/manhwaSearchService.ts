import { prisma } from '@libs/prisma';
import { Prisma, PublicationStatus } from '@prisma/client';
import { 
  SearchParams, 
  SearchResponse, 
  ManhwaSearchResult 
} from '../types/manhwa';
import { AppError, ErrorAppCode } from '@utils/errorHandler';

// Named exports following our pattern

// Build WHERE clause for search
const buildSearchWhere = (params: SearchParams): Prisma.ManhwaWhereInput => {
  const where: Prisma.ManhwaWhereInput = {};
  
  // Add filters if provided
  if (params.filters) {
    // Status filter
    if (params.filters.status?.length) {
      where.status = {
        in: params.filters.status.map(s => s.toUpperCase() as PublicationStatus)
      };
    }
    
    // Year range filter
    if (params.filters.yearRange) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            {
              startYear: {
                gte: params.filters.yearRange.start,
                lte: params.filters.yearRange.end
              }
            },
            {
              AND: [
                { startYear: { lte: params.filters.yearRange.start } },
                {
                  OR: [
                    { endYear: { gte: params.filters.yearRange.start } },
                    { endYear: null }
                  ]
                }
              ]
            }
          ]
        }
      ];
    }
    
    // Genre filter
    if (params.filters.genres?.length) {
      where.genres = {
        some: {
          genre: {
            slug: {
              in: params.filters.genres
            }
          }
        }
      };
    }
  }
  
  return where;
};

// Full-text search using PostgreSQL
export const searchManhwaFullText = async (
  params: SearchParams
): Promise<SearchResponse> => {
  const startTime = Date.now();
  
  try {
    const { page, limit } = params.pagination;
    const offset = (page - 1) * limit;
    
    // Build base WHERE clause
    const baseWhere = buildSearchWhere(params);
    
    // For full-text search, we need to use raw SQL
    if (params.query && params.query.trim()) {
      // Escape special characters in the query
      const sanitizedQuery = params.query.replace(/['"\\]/g, '');
      
      // Get total count first
      const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint as count
        FROM manhco.manhwa m
        WHERE m.search_vector @@ plainto_tsquery('english', ${sanitizedQuery})
        ${baseWhere.status ? Prisma.sql`AND m.status = ANY(${params.filters?.status?.map(s => s.toUpperCase())})` : Prisma.empty}
        ${params.filters?.genres?.length ? Prisma.sql`
          AND EXISTS (
            SELECT 1 FROM manhco.manhwa_genres mg
            JOIN manhco.genres g ON mg.genre_id = g.id
            WHERE mg.manhwa_id = m.id
            AND g.slug = ANY(${params.filters.genres})
          )
        ` : Prisma.empty}
      `;
      
      const totalResults = Number(countResult[0].count);
      
      // Get paginated results with rank
      const results = await prisma.$queryRaw<Array<any>>`
        SELECT 
          m.id,
          m.title_data->>'primary' as title,
          m.cover_thumbnail,
          SUBSTRING(m.synopsis, 1, 200) || '...' as synopsis,
          m.status,
          m.total_chapters,
          ts_rank(m.search_vector, plainto_tsquery('english', ${sanitizedQuery})) as score,
          COALESCE(
            ARRAY_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL),
            '{}'::text[]
          ) as genres
        FROM manhco.manhwa m
        LEFT JOIN manhco.manhwa_genres mg ON m.id = mg.manhwa_id
        LEFT JOIN manhco.genres g ON mg.genre_id = g.id
        WHERE m.search_vector @@ plainto_tsquery('english', ${sanitizedQuery})
        ${baseWhere.status ? Prisma.sql`AND m.status = ANY(${params.filters?.status?.map(s => s.toUpperCase())})` : Prisma.empty}
        ${params.filters?.genres?.length ? Prisma.sql`
          AND EXISTS (
            SELECT 1 FROM manhco.manhwa_genres mg2
            JOIN manhco.genres g2 ON mg2.genre_id = g2.id
            WHERE mg2.manhwa_id = m.id
            AND g2.slug = ANY(${params.filters.genres})
          )
        ` : Prisma.empty}
        GROUP BY m.id, m.title_data, m.cover_thumbnail, m.synopsis, m.status, m.total_chapters, m.search_vector
        ORDER BY ts_rank(m.search_vector, plainto_tsquery('english', ${sanitizedQuery})) DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
      
      // Transform results
      const searchResults: ManhwaSearchResult[] = results.map(row => ({
        id: row.id,
        title: row.title,
        coverThumbnail: row.cover_thumbnail,
        synopsis: row.synopsis,
        status: row.status.toLowerCase(),
        totalChapters: row.total_chapters,
        genres: row.genres || [],
        score: parseFloat(row.score)
      }));
      
      return {
        results: searchResults,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalResults / limit),
          totalResults
        },
        metadata: {
          sourcesQueried: ['local'],
          queryTime: Date.now() - startTime
        }
      };
    } else {
      // No search query, just filter
      const [results, totalResults] = await Promise.all([
        prisma.manhwa.findMany({
          where: baseWhere,
          select: {
            id: true,
            titleData: true,
            coverThumbnail: true,
            synopsis: true,
            status: true,
            totalChapters: true,
            genres: {
              select: {
                genre: {
                  select: {
                    name: true
                  }
                }
              }
            }
          },
          take: limit,
          skip: offset,
          orderBy: {
            updatedAt: 'desc'
          }
        }),
        prisma.manhwa.count({ where: baseWhere })
      ]);
      
      // Transform results
      const searchResults: ManhwaSearchResult[] = results.map(manhwa => ({
        id: manhwa.id,
        title: (manhwa.titleData as { primary: string }).primary,
        coverThumbnail: manhwa.coverThumbnail,
        synopsis: manhwa.synopsis.substring(0, 200) + '...',
        status: manhwa.status.toLowerCase(),
        totalChapters: manhwa.totalChapters,
        genres: manhwa.genres.map(g => g.genre.name)
      }));
      
      return {
        results: searchResults,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalResults / limit),
          totalResults
        },
        metadata: {
          sourcesQueried: ['local'],
          queryTime: Date.now() - startTime
        }
      };
    }
  } catch (error) {
    console.error('Search error:', error);
    throw new AppError(
      'Search failed',
      500,
      ErrorAppCode.ManhwaSearchFailed,
      error
    );
  }
};

// Search by genre
export const searchByGenre = async (
  genreSlug: string,
  page: number = 1,
  limit: number = 20
): Promise<SearchResponse> => {
  return searchManhwaFullText({
    query: '',
    filters: {
      genres: [genreSlug]
    },
    pagination: { page, limit },
    includeExternal: false
  });
};

// Get trending manhwa (most recently updated)
export const getTrendingManhwa = async (
  limit: number = 20
): Promise<ManhwaSearchResult[]> => {
  try {
    const results = await prisma.manhwa.findMany({
      where: {
        status: 'ONGOING'
      },
      select: {
        id: true,
        titleData: true,
        coverThumbnail: true,
        synopsis: true,
        status: true,
        totalChapters: true,
        genres: {
          select: {
            genre: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: limit
    });
    
    return results.map(manhwa => ({
      id: manhwa.id,
      title: (manhwa.titleData as { primary: string }).primary,
      coverThumbnail: manhwa.coverThumbnail,
      synopsis: manhwa.synopsis.substring(0, 200) + '...',
      status: manhwa.status.toLowerCase(),
      totalChapters: manhwa.totalChapters,
      genres: manhwa.genres.map(g => g.genre.name)
    }));
  } catch (error) {
    throw new AppError(
      'Failed to get trending manhwa',
      500,
      ErrorAppCode.ManhwaSearchFailed,
      error
    );
  }
};

// Get recently added manhwa
export const getRecentlyAdded = async (
  limit: number = 20
): Promise<ManhwaSearchResult[]> => {
  try {
    const results = await prisma.manhwa.findMany({
      select: {
        id: true,
        titleData: true,
        coverThumbnail: true,
        synopsis: true,
        status: true,
        totalChapters: true,
        genres: {
          select: {
            genre: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });
    
    return results.map(manhwa => ({
      id: manhwa.id,
      title: (manhwa.titleData as { primary: string }).primary,
      coverThumbnail: manhwa.coverThumbnail,
      synopsis: manhwa.synopsis.substring(0, 200) + '...',
      status: manhwa.status.toLowerCase(),
      totalChapters: manhwa.totalChapters,
      genres: manhwa.genres.map(g => g.genre.name)
    }));
  } catch (error) {
    throw new AppError(
      'Failed to get recently added manhwa',
      500,
      ErrorAppCode.ManhwaSearchFailed,
      error
    );
  }
};