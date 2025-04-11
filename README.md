# Manhco Backend

A Node.js backend service for Manhco, built with Express, TypeScript, and Prisma.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
- [Database Configuration](#database-configuration)
  - [Multischema Support](#multischema-support)
- [Development](#development)
  - [Running the Server](#running-the-server)
  - [API Endpoints](#api-endpoints)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Overview

Manhco Backend is a RESTful API service providing backend functionality for the Manhco platform. It uses Express.js for handling HTTP requests, Prisma as an ORM for PostgreSQL database interactions, and TypeScript for type safety.

## Features

- **TypeScript** for type safety and improved developer experience
- **Express.js** as the web server framework
- **Prisma ORM** for database operations with PostgreSQL
- **Multi-schema database** architecture for better organization
- **Zod** for request validation
- **Error handling** middleware
- **Waitlist entry API** for collecting user information

## Project Structure

```
manhco_backend/
├── prisma/                   # Prisma configuration and schema
│   └── schema.prisma         # Database schema definition
├── src/
│   ├── controllers/          # Request handlers for routes
│   │   └── waitlistController.ts
│   ├── libs/                 # Shared libraries
│   │   └── prisma.ts         # Prisma client initialization
│   ├── middlewares/          # Express middlewares
│   ├── routes/               # API route definitions
│   │   └── v1/
│   │       └── waitlist/
│   │           └── waitlistRoutes.ts
│   ├── schemas/              # Request/response validation schemas
│   │   └── waitlistEntrySchema.ts
│   ├── utils/                # Utility functions
│   │   └── errorHandler.ts   # Error handling utilities
│   ├── app.ts                # Express app configuration
│   └── server.ts             # Server entry point
├── .env                      # Environment variables
├── .gitignore                # Git ignore file
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── README.md                 # Project documentation
```

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- PostgreSQL database (NeonDB or similar PostgreSQL provider)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/manhco_backend.git
   cd manhco_backend
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
PORT=8000
ENVIRONMENT=development
CORS_ORIGIN_DEV=...
CORS_ORIGIN_PROD=...
DATABASE_URL=...
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=.
SESSION_SECRET=...
```

Generate the session secret via Python:
```python
import secrets
print(secrets.token_hex(32))
```

## Database Configuration

The project uses PostgreSQL with Prisma ORM. The database schema is defined in `prisma/schema.prisma`.

### Multischema Support

This project uses Prisma's multischema feature to organize the database logically. The database is currently configured with the following schemas:

- `manhco`: Main application schema
- `waiting_list`: Stores waitlist-related tables

To sync the database with your Prisma schema, run:

```bash
npx prisma db push
```

## Development

### Running the Server

Start the development server with hot reload:

```bash
npm run dev
# or
yarn dev
```

The server will start on the port specified in your `.env` file (default: 8000).

### API Endpoints

#### Waitlist API

- **Create a waitlist entry**:
  - `POST /api/v1/waitlist/entry`
  - Request body:
    ```json
    {
      "firstName": "John",
      "secondName": "Doe",
      "email": "john.doe@example.com",
      "message": "Looking forward to using the platform!"
    }
    ```
  - Response:
    ```json
    {
      "id": 1,
      "firstName": "John",
      "secondName": "Doe",
      "email": "john.doe@example.com",
      "message": "Looking forward to using the platform!"
    }
    ```

## Deployment

### Production Build

1. Build the TypeScript code:
   ```bash
   npm run build
   # or
   yarn build
   ```

2. Start the production server:
   ```bash
   npm start
   # or
   yarn start
   ```

### Deploying to a Hosting Service

For production deployment, consider:
- Docker containerization
- Platform as a Service (PaaS) like Heroku, Render, or Railway
- Serverless deployment using AWS Lambda, Vercel, or Netlify

## Troubleshooting

### Database Issues

If you encounter database-related issues, especially with the multischema setup, refer to the troubleshooting guide:

- [Prisma Multischema Troubleshooting](./PRISMA_MULTISCHEMA_TROUBLESHOOTING.md)

Common database issues can be solved by:

```bash
# Synchronize your schema with the database
npx prisma db push

# Reset the database (dev environments only - will delete data)
npx prisma db push --force-reset

# Regenerate the Prisma client
npx prisma generate
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Submit a pull request