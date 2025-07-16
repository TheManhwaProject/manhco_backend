import { Manhwa as PrismaManhwa, Genre as PrismaGenre, DataSource, PublicationStatus, SyncStatus } from '@prisma/client';

// 🚨 MANHCO = KOREAN MANHWA ONLY
// This platform exclusively serves Korean comics (manhwa), not manga or manhua
// All content should have originalLanguage: 'ko' from Mangadx

// Title structure matches Mangadx's complex title system
export interface ManhwaTitleData {
  primary: string;              // Main title to display
  alternatives: Array<{
    language: string;           // ISO 639-1 code (en, ko, ja, etc.)
    title: string;
  }>;
  romanized?: string;           // Romanized version of Asian titles
}

// Special chapters like prologues, .5 chapters, omakes
export interface SpecialChapterInfo {
  chapterNumber: string;        // Can be "0", "32.5", "EX1", etc.
  title: string;
  description?: string;
}

// Extended type with parsed JSON fields
export interface ManhwaEntity extends Omit<PrismaManhwa, 'titleData' | 'specialChapters'> {
  titleData: ManhwaTitleData;
  specialChapters?: SpecialChapterInfo[];
  genres?: Array<{
    genre: PrismaGenre;
  }>;
}

// Search result optimized for list display
export interface ManhwaSearchResult {
  id: number;
  title: string;
  coverThumbnail?: string;
  synopsis: string;              // Truncated to 200 chars
  status: string;
  totalChapters?: number;
  genres: string[];
  score?: number;                // PostgreSQL ts_rank score
}

// Search parameters matching our UI and API needs
export interface SearchParams {
  query: string;
  filters?: {
    genres?: string[];           // Genre slugs, not UUIDs
    status?: string[];
    yearRange?: { start: number; end: number };
  };
  pagination: {
    page: number;
    limit: number;               // Max 100
  };
  includeExternal: boolean;      // Search Mangadex if true
}

// Search response with metadata
export interface SearchResponse {
  results: ManhwaSearchResult[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalResults: number;
  };
  metadata: {
    sourcesQueried: string[];
    queryTime: number;
  };
}

// Create/update DTOs
export interface CreateManhwaDto {
  title: ManhwaTitleData;
  synopsis: string;
  status: PublicationStatus;
  publisher?: string;
  totalChapters?: number;
  genres?: string[];             // Genre slugs
}

// Mangadex API types based on actual responses
export interface MangadexManga {
  id: string;                    // UUID
  type: 'manga';
  attributes: {
    title: { [key: string]: string };        // Language code keys
    altTitles: Array<{ [key: string]: string }>;
    description: { [key: string]: string };  // Language code keys
    isLocked: boolean;
    links?: { [key: string]: string };       // External links
    originalLanguage: string;
    lastVolume?: string;
    lastChapter?: string;
    publicationDemographic?: string;
    status: string;
    year?: number;
    contentRating: string;
    state: string;
    createdAt: string;
    updatedAt: string;
    tags: Array<{
      id: string;                // UUID
      type: 'tag';
      attributes: {
        name: { [key: string]: string };
        description: { [key: string]: string };
        group: string;           // 'theme', 'genre', 'format'
        version: number;
      };
    }>;
  };
  relationships?: Array<{
    id: string;
    type: string;                // 'author', 'artist', 'cover_art'
    attributes?: {
      fileName?: string;         // For cover_art
      volume?: string;
      createdAt?: string;
      updatedAt?: string;
    };
  }>;
}

// Mangadex error response structure
export interface MangadexError {
  result: 'error';
  errors: Array<{
    id: string;                  // UUID
    status: number;              // HTTP status
    title: string;               // Error type
    detail?: string;             // Human-readable message
    context?: any;               // Additional error data
  }>;
}

// Mangadex pagination response
export interface MangadexResponse<T> {
  result: 'ok' | 'error';
  response: 'collection' | 'entity';
  data: T;
  limit?: number;
  offset?: number;
  total?: number;
}

// Export enums for use in other files
export { DataSource, PublicationStatus, SyncStatus };