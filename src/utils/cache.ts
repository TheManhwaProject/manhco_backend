import NodeCache from 'node-cache';

// Separate caches for different data types
const entityCache = new NodeCache({
  stdTTL: parseInt(process.env.CACHE_TTL_DEFAULT || '3600'), // 1 hour
  checkperiod: 600,
  maxKeys: parseInt(process.env.CACHE_MAX_KEYS || '1000'),
  useClones: false // Better performance, but be careful with mutations
});

const searchCache = new NodeCache({
  stdTTL: parseInt(process.env.CACHE_TTL_SEARCH || '300'), // 5 minutes
  checkperiod: 60,
  maxKeys: 100
});

// Tag cache with longer TTL (tags rarely change)
const tagCache = new NodeCache({
  stdTTL: 86400, // 24 hours
  checkperiod: 3600,
  maxKeys: 1000
});

// Named exports following our pattern
export const getEntityCache = async <T>(key: string): Promise<T | null> => {
  try {
    return entityCache.get<T>(key) || null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null; // Cache errors should not break the app
  }
};

export const setEntityCache = async (
  key: string, 
  value: any, 
  ttl?: number
): Promise<void> => {
  try {
    entityCache.set(key, value, ttl || 0);
  } catch (error) {
    console.error('Cache set error:', error);
    // Continue without cache
  }
};

export const getSearchCache = async <T>(key: string): Promise<T | null> => {
  try {
    return searchCache.get<T>(key) || null;
  } catch (error) {
    return null;
  }
};

export const setSearchCache = async (key: string, value: any): Promise<void> => {
  try {
    searchCache.set(key, value);
  } catch (error) {
    console.error('Search cache error:', error);
  }
};

export const getTagCache = async <T>(key: string): Promise<T | null> => {
  try {
    return tagCache.get<T>(key) || null;
  } catch (error) {
    return null;
  }
};

export const setTagCache = async (key: string, value: any): Promise<void> => {
  try {
    tagCache.set(key, value);
  } catch (error) {
    console.error('Tag cache error:', error);
  }
};

export const invalidatePattern = (pattern: string): void => {
  const keys = entityCache.keys();
  const toDelete = keys.filter(key => key.includes(pattern));
  if (toDelete.length > 0) {
    entityCache.del(toDelete);
  }
};

export const generateSearchCacheKey = (params: any): string => {
  // Sort params for consistent keys
  const sorted = Object.keys(params).sort().reduce((acc, key) => {
    acc[key] = params[key];
    return acc;
  }, {} as any);
  
  return `search:${JSON.stringify(sorted)}`;
};

// Cache statistics for monitoring
export const getCacheStats = () => ({
  entity: entityCache.getStats(),
  search: searchCache.getStats(),
  tag: tagCache.getStats()
});