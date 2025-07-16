# Manhco Backend

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

A Node.js backend service for the Manhco platform, built with Express, TypeScript, Prisma, and PostgreSQL.

## Overview

Manhco Backend provides the core RESTful API services for the Manhco application. It leverages a modern tech stack including Express.js for the web framework, Prisma as the ORM for interacting with a PostgreSQL database, TypeScript for robust type-safety, and Passport.js for handling authentication.

## Features

- **Framework**: Express.js
- **Language**: TypeScript
- **Database ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: Passport.js (Google OAuth 2.0 strategy), JWT (Access & Refresh Tokens), Session Management
- **Validation**: Zod for request validation
- **API Versioning**: `/api/v1/`
- **Security**: CORS configuration, CSRF protection (via middleware), Cookie Parser
- **Environment Management**: `dotenv` for environment variables
- **Modular Design**: Multi-schema database, module aliases for cleaner imports
- **Error Handling**: Centralized error handling middleware
- **Korean Manhwa Service**: Comprehensive manhwa data management with MangaDex integration
- **Full-text Search**: PostgreSQL-powered search with relevance ranking
- **Background Sync**: Automated manhwa data synchronization with retry logic
- **Caching Layer**: Redis-compatible caching for optimal performance

## Project Structure

```
manhco_backend/
├── prisma/                   # Prisma configuration
│   └── schema.prisma         # Database schema definition
├── src/
│   ├── config/               # Configuration files (if any)
│   ├── controllers/          # Request handlers (logic)
│   │   └── manhwaController.ts # Korean manhwa API endpoints
│   ├── jobs/                 # Background job processors
│   │   └── manhwaSyncJob.ts  # Automated manhwa data synchronization
│   ├── lib/                  # Shared libraries (e.g., Prisma client)
│   ├── middleware/           # Express middleware (auth, error, session, csrf)
│   ├── passport/             # Passport.js strategy configurations (e.g., Google)
│   ├── routes/               # API route definitions (v1)
│   │   └── v1/manhwa/        # Manhwa API routes
│   ├── schemas/              # Zod validation schemas
│   │   └── manhwaSchemas.ts  # Manhwa request validation
│   ├── services/             # Business logic services
│   │   ├── mangadexService.ts # MangaDx API integration
│   │   ├── manhwaService.ts  # Core manhwa business logic
│   │   └── manhwaSearchService.ts # Full-text search implementation
│   ├── types/                # Custom TypeScript types/interfaces
│   │   └── manhwa.ts         # Manhwa type definitions
│   ├── utils/                # Utility functions
│   │   ├── cache.ts          # Caching utilities
│   │   └── requestCoalescer.ts # Request deduplication
│   ├── app.ts                # Express application configuration (middleware, etc.)
│   └── server.ts             # Server entry point (starts server, defines routes)
├── .env                      # Environment variables (ignored by git)
├── .gitignore                # Git ignore file
├── package.json              # Project metadata and dependencies
├── tsconfig.json             # TypeScript compiler options
├── README.md                 # This file
└── PRISMA_MULTISCHEMA_TROUBLESHOOTING.md # Guide for multi-schema issues
```

## Getting Started

### Prerequisites

- Node.js (Latest LTS version recommended)
- npm or yarn
- PostgreSQL Database (e.g., local instance, NeonDB, Supabase)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/manhco_backend.git # Replace with your repo URL
    cd manhco_backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Generate Prisma client:**
    This step is crucial after installing dependencies or changing the schema.
    ```bash
    npx prisma generate
    ```

### Environment Variables

Create a `.env` file in the root directory. Copy the example below and fill in your actual credentials and settings.

```env
# Server Configuration
PORT=8000
ENVIRONMENT=development # 'development' or 'production'

# CORS Origins (adjust for your frontend URLs)
CORS_ORIGIN_DEV=http://localhost:3000 # Example for local dev frontend
CORS_ORIGIN_PROD=https://your-production-frontend.com # Example for deployed frontend

# Database Connection (PostgreSQL)
# Example: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
DATABASE_URL="your_database_connection_string"

# Google OAuth 2.0 Credentials
# Obtain from Google Cloud Console: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GOOGLE_CALLBACK_URL="http://localhost:8000/api/v1/auth/google/callback" # Adjust host/port if needed

# Security & Session
SESSION_SECRET="your_strong_random_secret_for_sessions" # Generate using the Python command below
COOKIE_SECRET="your_strong_random_secret_for_cookies" # Generate using the Python command below

# JWT Secrets
JWT_ACCESS_SECRET="your_strong_random_secret_for_access_tokens" # Generate using the Python command below
JWT_REFRESH_SECRET="your_strong_random_secret_for_refresh_tokens" # Generate using the Python command below

# MangaDx API Configuration (for Korean manhwa service)
MANGADX_API_URL="https://api.mangadx.org"
MANGADX_USERNAME="your_mangadx_username"
MANGADX_PASSWORD="your_mangadx_password"

# Background Sync Configuration
SYNC_BATCH_SIZE=10                  # Number of manhwa to sync per batch
SYNC_CRON_SCHEDULE="*/15 * * * *"   # Cron schedule for background sync (every 15 minutes)

# --- How to Generate Secrets ---
# Use this Python command in your terminal for each secret:
# python -c "import secrets; print(secrets.token_hex(32))"
```

**Important:** Ensure all required variables listed in `src/server.ts` (especially `GOOGLE_*`, `JWT_*`, `SESSION_SECRET`, `DATABASE_URL`) are present and correctly configured. The server will fail to start if authentication-related variables are missing.

### Database Setup

1.  **Ensure PostgreSQL server is running** and accessible with the connection string provided in `.env`.
2.  **Synchronize Prisma schema with your database:**
    This command creates the schemas (`manhco`, `waiting_list`, `auth`) and tables defined in `prisma/schema.prisma`.
    ```bash
    npx prisma db push
    ```
    *(For development, if you need to reset the database, use `npx prisma db push --force-reset` - This deletes all data!)*

## Usage

### Running the Server (Development)

Start the development server with hot-reloading enabled:

```bash
npm run dev
# or
yarn dev
```

The server will typically start on `http://localhost:8000` (or the `PORT` specified in `.env`).

### Building for Production

Compile the TypeScript code into JavaScript:

```bash
npm run build
# or
yarn build
```

This will create a `dist/` directory with the compiled code.

### Running in Production

Start the server using the compiled JavaScript code:

```bash
npm start
# or
yarn start
```

Ensure `NODE_ENV` environment variable is set to `production` in your deployment environment for optimal performance and security settings (like production CORS origins).

## Technology Stack

-   **Backend Framework**: Express.js
-   **Language**: TypeScript
-   **Database**: PostgreSQL
-   **ORM**: Prisma
-   **Authentication**: Passport.js (Google OAuth 2.0), JSON Web Tokens (JWT)
-   **Validation**: Zod
-   **Package Manager**: npm / yarn
-   **Development Server**: `ts-node-dev`

## Database

### Multi-schema Architecture

The database utilizes Prisma's multi-schema feature for logical separation:

-   **`manhco`**: Contains core application data (e.g., `users` table).
-   **`waiting_list`**: Contains tables related to the waitlist feature (e.g., `waitlist_entry` table).
-   **`auth`**: Contains tables related to authentication and authorization (e.g., `roles`, `refresh_tokens` tables).

Refer to `prisma/schema.prisma` for detailed definitions and relationships.

## Korean Manhwa Service

### Overview

The Korean Manhwa Service is a comprehensive data management system that provides:

- **Korean-only content validation** - Strict filtering to serve only Korean manhwa
- **MangaDx API integration** - Automated data synchronization with external sources
- **Full-text search** - PostgreSQL-powered search with relevance ranking
- **Background sync jobs** - Automated data updates with retry logic
- **Intelligent caching** - Multi-layer caching for optimal performance
- **British audience optimization** - English-first titles with Korean fallbacks

### Key Features

#### 🇰🇷 **Korean Content Filtering**
- API-level filtering: `originalLanguage[]=ko` on all MangaDx calls
- Import validation: Rejects non-Korean content during manual imports
- Content validation: Validates Korean manhwa exclusively

#### 🔍 **Advanced Search**
- Full-text search using PostgreSQL `to_tsvector` with English language processing
- Relevance ranking with `ts_rank` scoring
- Genre filtering and status-based searches
- External search fallback to MangaDx when local results are insufficient

#### 🔄 **Background Synchronization**
- Automated sync every 15 minutes (configurable)
- Priority-based queue (failed syncs get higher priority)
- Batch processing with configurable batch sizes
- Retry logic with exponential backoff

#### 🚀 **Performance Optimizations**
- Request coalescing to prevent duplicate API calls
- Multi-layer caching (search results, entities, tags)
- Background refresh without blocking user requests
- Smart cache invalidation with pattern matching

### API Endpoints

#### Public Endpoints
- `GET /api/v1/manhwa/search` - Search Korean manhwa
- `GET /api/v1/manhwa/:id` - Get single manhwa by ID
- `GET /api/v1/manhwa/trending` - Get trending manhwa
- `GET /api/v1/manhwa/recent` - Get recently added manhwa
- `GET /api/v1/manhwa/genres` - Get available genres

#### Admin Endpoints
- `POST /api/v1/admin/manhwa/import` - Import manhwa from MangaDx
- `POST /api/v1/admin/manhwa/sync/:id` - Force sync single manhwa
- `POST /api/v1/admin/manhwa/sync/all` - Trigger full sync
- `GET /api/v1/admin/manhwa/sync/status` - Get sync job status
- `GET /api/v1/admin/manhwa/cache/status` - Get cache statistics
- `POST /api/v1/admin/manhwa/cache/clear` - Clear cache patterns

### Data Flow

1. **Search Request** → Cache Check → Local Database → External API (if needed)
2. **Background Sync** → Priority Queue → MangaDx API → Database Update → Cache Invalidation
3. **Manual Import** → Korean Validation → MangaDx Fetch → Database Insert → Cache Update

### Configuration

The manhwa service uses these environment variables:

```env
# MangaDx API
MANGADX_API_URL=https://api.mangadx.org
MANGADX_USERNAME=your_username
MANGADX_PASSWORD=your_password

# Background Sync
SYNC_BATCH_SIZE=10
SYNC_CRON_SCHEDULE="*/15 * * * *"
```

### Database Schema

The manhwa service uses these main tables:

- `manhwa` - Core manhwa data with JSON title structure
- `genres` - Genre definitions with slugs
- `manhwa_genres` - Many-to-many relationship table

Key fields:
- `mangadx_id` - External MangaDx identifier
- `data_source` - Either 'LOCAL' or 'MANGADX'
- `title_data` - JSON structure with primary/alternative titles
- `sync_status` - Sync state ('CURRENT', 'FAILED', 'PENDING')
- `search_vector` - PostgreSQL full-text search index

## Authentication & Authorization

-   **Authentication Strategy**: Google OAuth 2.0 via Passport.js.
-   **Session Management**: `express-session` is used, likely storing session IDs in cookies.
-   **Token-Based Auth**: JWT (JSON Web Tokens) are used for API authentication after initial login.
    -   **Access Tokens**: Short-lived tokens granting access to protected resources.
    -   **Refresh Tokens**: Longer-lived tokens stored securely (e.g., in HTTP-only cookies) used to obtain new access tokens without re-login.
-   **Authorization**: Role-based access control is implemented using the `Role` model linked to `User`. Middleware likely checks user roles for protected routes/actions.

## Security

-   **CORS**: Configured via `cors` middleware, allowing requests only from specified origins (different for development and production).
-   **CSRF Protection**: `validateCsrfToken` middleware suggests protection against Cross-Site Request Forgery attacks, likely using tokens synchronized between frontend and backend.
-   **Session Security**: Uses `cookie-parser` and `express-session` with secrets stored in environment variables. Consider configuring secure, HTTP-only cookies.
-   **Input Validation**: Zod schemas are used to validate incoming request data.
-   **Environment Variables**: Sensitive credentials (API keys, secrets, database URL) are managed via `.env` file and should not be committed to version control.
-   **Helmet.js** (Recommended): Consider adding Helmet.js middleware for setting various security-related HTTP headers.

## Configuration

### Module Aliases

The project uses `module-alias` (configured in `package.json`) for shorter, cleaner import paths:

-   `@config`: `src/config`
-   `@routes`: `src/routes`
-   `@utils`: `src/utils`
-   `@libs`: `src/lib`
-   `@schemas`: `src/schemas`
-   `@controllers`: `src/controllers`
-   `@middleware`: `src/middleware`
-   `@root`: `src`

## Troubleshooting

-   **Database Connection Issues**: Verify `DATABASE_URL` in `.env`. Check if the PostgreSQL server is running and accessible. Ensure firewall rules allow connection.
-   **Prisma Schema Sync Errors**: Run `npx prisma generate` after schema changes. Use `npx prisma db push` to apply changes. Consult `PRISMA_MULTISCHEMA_TROUBLESHOOTING.md` for specific multi-schema issues.
-   **Missing Environment Variables**: Check the server startup logs for errors related to missing variables (especially auth-related ones). Ensure your `.env` file is correctly formatted and loaded.
-   **CORS Errors**: Ensure `CORS_ORIGIN_DEV` or `CORS_ORIGIN_PROD` in `.env` matches the origin of your frontend application exactly. Check browser console logs for details.
-   **Authentication Issues**: Double-check Google OAuth credentials and callback URL configuration in `.env` and Google Cloud Console. Verify JWT and Session secrets are set.

## Contributing

1.  Fork the repository.
2.  Create a feature branch: `git checkout -b feature/your-feature-name`
3.  Make your changes.
4.  Commit your changes: `git commit -am 'Add some feature'`
5.  Push to the branch: `git push origin feature/your-feature-name`
6.  Submit a pull request.

Please ensure code quality, add tests if applicable, and update documentation as needed.

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details (or refer to the ISC license text).