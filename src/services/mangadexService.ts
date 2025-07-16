import axios, { AxiosInstance, AxiosError } from 'axios';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { AppError, ErrorAppCode } from '@utils/errorHandler';
import { 
  MangadexManga, 
  MangadexError,
  MangadexResponse,
  ManhwaTitleData,
  ManhwaEntity 
} from '@types/manhwa';

// Named exports following our pattern
let axiosInstance: AxiosInstance;
let rateLimiter: RateLimiterMemory;
let authToken: string | undefined;
let tokenExpiry: Date | undefined;

// Initialize service components
const initializeMangadexService = () => {
  // Axios instance with defaults
  axiosInstance = axios.create({
    baseURL: process.env.MANGADEX_API_URL || 'https://api.mangadex.org',
    timeout: 10000,
    headers: {
      'User-Agent': 'ManhcoService/1.0' // Identify our service
    }
  });
  
  // Rate limiter: 5/second as per API docs
  rateLimiter = new RateLimiterMemory({
    points: 5,
    duration: 1,
    blockDuration: 60 // Block for 1 minute if exceeded
  });
  
  // Request interceptor for rate limiting and auth
  axiosInstance.interceptors.request.use(async (config) => {
    try {
      await rateLimiter.consume(1);
    } catch (error) {
      throw new AppError(
        'Rate limit exceeded. Please wait before making more requests.',
        429,
        ErrorAppCode.RateLimitExceeded
      );
    }
    
    // Add auth for protected endpoints
    if (needsAuth(config.url || '')) {
      const token = await ensureValidToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  });
  
  // Response interceptor for error handling
  axiosInstance.interceptors.response.use(
    response => response,
    async error => {
      // Handle Mangadex-specific errors
      if (error.response?.data?.result === 'error') {
        return handleMangadexError(error);
      }
      
      // Token expired - try refresh once
      if (error.response?.status === 401 && error.config && !error.config._retry) {
        error.config._retry = true;
        authToken = undefined;
        const token = await ensureValidToken();
        error.config.headers.Authorization = `Bearer ${token}`;
        return axiosInstance.request(error.config);
      }
      
      throw error;
    }
  );
};

// Check if endpoint needs authentication
const needsAuth = (url: string): boolean => {
  const protectedPaths = ['/user', '/manga/draft', '/upload', '/chapter/*/read'];
  return protectedPaths.some(path => {
    const regex = new RegExp(path.replace('*', '.*'));
    return regex.test(url);
  });
};

// Handle Mangadex error responses
const handleMangadexError = (error: AxiosError<MangadexError>) => {
  const mangadexError = error.response?.data;
  
  if (!mangadexError?.errors?.[0]) {
    throw error;
  }
  
  const firstError = mangadexError.errors[0];
  
  // Map Mangadex errors to our error codes
  switch (firstError.title) {
    case 'captcha_required_exception':
      throw new AppError(
        'Captcha required. Too many requests from this IP.',
        403,
        ErrorAppCode.RateLimitExceeded,
        { siteKey: firstError.context?.siteKey }
      );
    
    case 'validation_exception':
      throw new AppError(
        firstError.detail || 'Invalid request parameters',
        400,
        ErrorAppCode.BadInput
      );
    
    case 'entity_not_found_exception':
      throw new AppError(
        'Manga not found on Mangadex',
        404,
        ErrorAppCode.ManhwaNotFound
      );
    
    default:
      throw new AppError(
        firstError.detail || 'Mangadex API error',
        firstError.status,
        ErrorAppCode.ExternalApiError,
        mangadexError
      );
  }
};

// Ensure we have a valid auth token
const ensureValidToken = async (): Promise<string> => {
  // Check if current token is still valid (with 1 minute buffer)
  if (authToken && tokenExpiry && tokenExpiry > new Date(Date.now() + 60000)) {
    return authToken;
  }
  
  try {
    const response = await axios.post(
      `${process.env.MANGADEX_API_URL}/auth/login`,
      {
        username: process.env.MANGADEX_USERNAME,
        password: process.env.MANGADEX_PASSWORD
      }
    );
    
    authToken = response.data.token.session;
    // Token expires in 15 minutes, but we'll refresh at 14 to be safe
    tokenExpiry = new Date(Date.now() + 14 * 60 * 1000);
    
    return authToken;
  } catch (error) {
    console.error('Mangadex auth failed:', error);
    throw new AppError(
      'Failed to authenticate with Mangadex',
      500,
      ErrorAppCode.ExternalApiError
    );
  }
};

// Search manga with all available filters
export const searchMangadex = async (
  query: string,
  options: {
    limit?: number;
    offset?: number;
    contentRating?: string[];
    status?: string[];
    publicationDemographic?: string[];
    tags?: string[];        // Tag UUIDs
    excludedTags?: string[]; // Tag UUIDs to exclude
  } = {}
): Promise<MangadexResponse<MangadexManga[]>> => {
  try {
    const params: any = {
      title: query,
      limit: Math.min(options.limit || 20, 100), // Enforce API limit
      offset: options.offset || 0,
      'order[relevance]': 'desc',
      'includes[]': ['cover_art', 'author', 'artist']
    };
    
    // Check pagination limit (API rejects offset + limit > 10,000)
    if (params.offset + params.limit > 10000) {
      throw new AppError(
        'Search results beyond 10,000 items are not available',
        400,
        ErrorAppCode.PaginationLimitExceeded
      );
    }
    
    // Content rating (default excludes pornographic)
    if (options.contentRating) {
      options.contentRating.forEach((rating, i) => {
        params[`contentRating[${i}]`] = rating;
      });
    } else {
      // Default to safe + suggestive only
      params['contentRating[0]'] = 'safe';
      params['contentRating[1]'] = 'suggestive';
    }
    
    // Other filters
    if (options.status) {
      options.status.forEach((status, i) => {
        params[`status[${i}]`] = status;
      });
    }
    
    if (options.publicationDemographic) {
      options.publicationDemographic.forEach((demo, i) => {
        params[`publicationDemographic[${i}]`] = demo;
      });
    }
    
    if (options.tags) {
      options.tags.forEach((tag, i) => {
        params[`includedTags[${i}]`] = tag;
      });
    }
    
    if (options.excludedTags) {
      options.excludedTags.forEach((tag, i) => {
        params[`excludedTags[${i}]`] = tag;
      });
    }
    
    const response = await axiosInstance.get('/manga', { params });
    return response.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    
    throw new AppError(
      'Mangadex search failed',
      500,
      ErrorAppCode.ExternalApiError,
      error
    );
  }
};

// Get single manga by ID
export const getMangadexById = async (mangadexId: string): Promise<MangadexManga> => {
  try {
    const response = await axiosInstance.get(`/manga/${mangadexId}`, {
      params: {
        'includes[]': ['cover_art', 'author', 'artist']
      }
    });
    
    return response.data.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    
    throw new AppError(
      'Failed to fetch manga from Mangadex',
      500,
      ErrorAppCode.ExternalApiError,
      error
    );
  }
};

// Get available tags for filtering
export const getMangadexTags = async (): Promise<Array<{
  id: string;
  name: string;
  group: string;
}>> => {
  try {
    const response = await axiosInstance.get('/manga/tag');
    
    return response.data.data.map((tag: any) => ({
      id: tag.id,
      name: tag.attributes.name.en || Object.values(tag.attributes.name)[0],
      group: tag.attributes.group
    }));
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return []; // Non-critical, return empty array
  }
};

// Transform Mangadex data to our format
export const transformMangadexData = (manga: MangadexManga): Partial<ManhwaEntity> => {
  // Extract title with fallback chain
  const titleData: ManhwaTitleData = {
    primary: manga.attributes.title.en || 
             manga.attributes.title.ko || 
             manga.attributes.title.ja ||
             Object.values(manga.attributes.title)[0] || 
             'Unknown Title',
    alternatives: manga.attributes.altTitles.map(alt => ({
      language: Object.keys(alt)[0],
      title: Object.values(alt)[0]
    }))
  };
  
  // Find romanized version
  const romajiTitle = manga.attributes.altTitles.find(
    alt => alt['ja-ro'] || alt['ko-ro'] || alt['en-ro']
  );
  if (romajiTitle) {
    titleData.romanized = Object.values(romajiTitle)[0];
  }
  
  // Map status to our enum
  const statusMap: Record<string, any> = {
    'ongoing': 'ONGOING',
    'completed': 'COMPLETED',  
    'hiatus': 'HIATUS',
    'cancelled': 'CANCELLED'
  };
  
  // Extract synopsis with language fallback
  const synopsis = manga.attributes.description.en || 
                  manga.attributes.description.ko ||
                  manga.attributes.description.ja ||
                  Object.values(manga.attributes.description)[0] ||
                  'No description available.';
  
  return {
    mangadexId: manga.id,
    dataSource: 'MANGADX',
    titleData,
    status: statusMap[manga.attributes.status] || 'ONGOING',
    startYear: manga.attributes.year,
    synopsis,
    // Note: totalChapters not provided by Mangadex API
  };
};

// Get cover image URLs with proper construction
export const getMangadexCoverUrl = (
  manga: MangadexManga, 
  quality: 'thumb' | 'medium' | 'large' = 'medium'
): string | null => {
  const coverRel = manga.relationships?.find(
    rel => rel.type === 'cover_art' && rel.attributes?.fileName
  );
  
  if (!coverRel?.attributes?.fileName) {
    return null;
  }
  
  // Construct URL based on Mangadex documentation
  const baseUrl = 'https://uploads.mangadex.org/covers';
  const mangaId = manga.id;
  const filename = coverRel.attributes.fileName;
  
  // Quality suffixes
  const qualityMap = {
    thumb: '.256.jpg',   // 256px width
    medium: '.512.jpg',  // 512px width  
    large: ''            // Original size
  };
  
  return `${baseUrl}/${mangaId}/${filename}${qualityMap[quality]}`;
};

// Initialize service on import
initializeMangadexService();

// Endpoint-specific rate limiters
const endpointLimiters = new Map<string, RateLimiterMemory>();

// Login: 30 per hour
endpointLimiters.set('login', new RateLimiterMemory({
  points: 30,
  duration: 3600
}));

// Random manga: 60 per minute
endpointLimiters.set('random', new RateLimiterMemory({
  points: 60,
  duration: 60
}));

// Export additional utilities
export const checkEndpointRateLimit = async (endpoint: string) => {
  const limiter = endpointLimiters.get(endpoint);
  if (limiter) {
    try {
      await limiter.consume(1);
    } catch (error) {
      throw new AppError(
        `Rate limit exceeded for ${endpoint} endpoint`,
        429,
        ErrorAppCode.RateLimitExceeded
      );
    }
  }
};