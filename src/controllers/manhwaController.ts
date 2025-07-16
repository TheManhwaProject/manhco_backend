import { Request, Response, NextFunction } from 'express';
import * as manhwaService from '../services/manhwaService';
import * as searchService from '../services/manhwaSearchService';
import { 
  searchManhwaSchema, 
  createManhwaSchema,
  bulkGetManhwaSchema,
  importManhwaSchema
} from '@schemas/manhwaSchemas';
import { AppError, ErrorAppCode, parsePrismaError } from '@utils/errorHandler';
import * as cache from '@utils/cache';

// Search Korean manhwa - our most complex endpoint (Korean content only)
export const searchManhwa = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Validate with Zod
    const parsed = searchManhwaSchema.parse(req.body);
    
    const results = await manhwaService.searchManhwa({
      query: parsed.query,
      filters: parsed.filters,
      pagination: parsed.pagination,
      includeExternal: parsed.includeExternal
    });
    
    res.json(results);
  } catch (err) {
    // Let error middleware handle it
    next(err);
  }
};

// Get single manhwa
export const getManhwaById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const manhwaId = parseInt(id, 10);
    
    if (isNaN(manhwaId)) {
      throw new AppError('Invalid manhwa ID', 400, ErrorAppCode.BadInput);
    }
    
    const forceRefresh = req.query.refresh === 'true';
    const manhwa = await manhwaService.getManhwaById(manhwaId, forceRefresh);
    
    // Add cache headers for browser caching
    if (!forceRefresh) {
      res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    }
    
    res.json(manhwa);
  } catch (err) {
    next(err);
  }
};

// Create new manhwa (admin only)
export const createManhwa = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = createManhwaSchema.parse(req.body);
    const manhwa = await manhwaService.createManhwa(parsed);
    
    res.status(201).json(manhwa);
  } catch (err) {
    next(err);
  }
};

// Bulk fetch for lists
export const getManhwaBulk = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = bulkGetManhwaSchema.parse(req.body);
    
    // Convert to numbers
    const numericIds = parsed.ids.map(id =>
      typeof id === 'number' ? id : parseInt(id, 10)
    );
    
    const manhwaMap = await manhwaService.getManhwaByIds(numericIds);
    const notFound = numericIds.filter(id => !manhwaMap[id]);
    
    res.json({
      entities: manhwaMap,
      notFound
    });
  } catch (err) {
    next(err);
  }
};

// Force sync from Mangadex (admin only)
export const refreshManhwa = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const manhwaId = parseInt(id, 10);
    
    if (isNaN(manhwaId)) {
      throw new AppError('Invalid manhwa ID', 400, ErrorAppCode.BadInput);
    }
    
    // Get manhwa to find mangadexId
    const manhwa = await manhwaService.getManhwaById(manhwaId);
    
    if (!manhwa.mangadexId) {
      throw new AppError(
        'Cannot sync local-only manhwa',
        400,
        ErrorAppCode.BadInput
      );
    }
    
    const result = await manhwaService.syncFromMangadex(
      manhwaId,
      manhwa.mangadexId
    );
    
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Import Korean manhwa from Mangadex (admin only - validates Korean content)
export const importFromMangadex = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = importManhwaSchema.parse(req.body);
    const manhwa = await manhwaService.importFromMangadex(parsed.mangadexId);
    
    res.status(201).json(manhwa);
  } catch (err) {
    next(err);
  }
};

// Get available genres
export const getGenres = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const genres = await manhwaService.getAllGenres();
    
    // Cache for 24 hours
    res.set('Cache-Control', 'public, max-age=86400');
    res.json(genres);
  } catch (err) {
    next(err);
  }
};

// Get trending manhwa
export const getTrending = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const results = await searchService.getTrendingManhwa(Math.min(limit, 100));
    
    res.json(results);
  } catch (err) {
    next(err);
  }
};

// Get recently added manhwa
export const getRecentlyAdded = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const results = await searchService.getRecentlyAdded(Math.min(limit, 100));
    
    res.json(results);
  } catch (err) {
    next(err);
  }
};

// Get cache status (admin only)
export const getCacheStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const stats = cache.getCacheStats();
    res.json({
      cache: stats,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

// Clear cache (admin only)
export const clearCache = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { pattern } = req.body;
    
    if (pattern) {
      cache.invalidatePattern(pattern);
      res.json({ 
        message: `Cache cleared for pattern: ${pattern}`,
        timestamp: new Date().toISOString()
      });
    } else {
      // Clear all caches - implement if needed
      res.json({ 
        message: 'Full cache clear not implemented for safety',
        timestamp: new Date().toISOString()
      });
    }
  } catch (err) {
    next(err);
  }
};