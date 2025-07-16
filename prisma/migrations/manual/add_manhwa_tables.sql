-- Add Manhwa Data Service Tables
-- This migration adds tables for the Manhwa data service with full-text search support

-- Enable trigram extension for fuzzy search (optional but recommended)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create enums
CREATE TYPE manhco."DataSource" AS ENUM ('LOCAL', 'Mangadex');
CREATE TYPE manhco."PublicationStatus" AS ENUM ('ONGOING', 'COMPLETED', 'HIATUS', 'CANCELLED');
CREATE TYPE manhco."SyncStatus" AS ENUM ('CURRENT', 'OUTDATED', 'FAILED');

-- Create manhwa table
CREATE TABLE manhco.manhwa (
  id SERIAL PRIMARY KEY,
  mangadex_id VARCHAR(255) UNIQUE,
  data_source manhco."DataSource" NOT NULL DEFAULT 'LOCAL',
  title_data JSONB NOT NULL,
  status manhco."PublicationStatus" NOT NULL,
  start_year INTEGER,
  end_year INTEGER,
  publisher VARCHAR(255),
  synopsis TEXT NOT NULL,
  total_chapters INTEGER,
  special_chapters JSONB,
  cover_thumbnail VARCHAR(500),
  cover_medium VARCHAR(500),
  cover_large VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_synced_at TIMESTAMP,
  sync_status manhco."SyncStatus" NOT NULL DEFAULT 'CURRENT',
  version INTEGER NOT NULL DEFAULT 1,
  search_vector tsvector
);

-- Create genres table
CREATE TABLE manhco.genres (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE
);

-- Create junction table for many-to-many relationship
CREATE TABLE manhco.manhwa_genres (
  manhwa_id INTEGER NOT NULL REFERENCES manhco.manhwa(id) ON DELETE CASCADE,
  genre_id INTEGER NOT NULL REFERENCES manhco.genres(id),
  PRIMARY KEY (manhwa_id, genre_id)
);

-- Create indexes
CREATE INDEX idx_manhwa_mangadex_id ON manhco.manhwa(mangadex_id);
CREATE INDEX idx_manhwa_status ON manhco.manhwa(status);
CREATE INDEX idx_manhwa_sync ON manhco.manhwa(sync_status, last_synced_at);
CREATE INDEX idx_manhwa_search_vector ON manhco.manhwa USING GIN(search_vector);

-- Create trigger function to maintain search vector
CREATE OR REPLACE FUNCTION manhco.update_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', NEW.title_data->>'primary'), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.synopsis, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_manhwa_search_vector 
BEFORE INSERT OR UPDATE ON manhco.manhwa
FOR EACH ROW EXECUTE FUNCTION manhco.update_search_vector();

-- Insert common genres based on Mangadex data
INSERT INTO manhco.genres (name, slug) VALUES
('Action', 'action'),
('Adventure', 'adventure'),
('Comedy', 'comedy'),
('Drama', 'drama'),
('Fantasy', 'fantasy'),
('Horror', 'horror'),
('Mystery', 'mystery'),
('Romance', 'romance'),
('Sci-Fi', 'sci-fi'),
('Slice of Life', 'slice-of-life'),
('Sports', 'sports'),
('Supernatural', 'supernatural'),
('Thriller', 'thriller'),
('Isekai', 'isekai'),
('Martial Arts', 'martial-arts'),
('School Life', 'school-life'),
('Historical', 'historical'),
('Psychological', 'psychological'),
('Seinen', 'seinen'),
('Shounen', 'shounen'),
('Shoujo', 'shoujo'),
('Josei', 'josei')
ON CONFLICT (slug) DO NOTHING;