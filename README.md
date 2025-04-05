# Manhco Backend

Backend API

## Setup

1. Clone repo
   ```sh
   git clone https://github.com/ifazak/manhco-backend.git
   ```
2. Install dependencies
   ```sh
   npm install
   ```
3. Create a `.env` file with the secrets filled in:
   ```sh
   PORT=8000
   ENVIRONMENT=development
   DATABASE_URL=...
   GOOGLE_OAUTH_CLIENT_ID=...
   GOOGLE_OAUTH_CLIENT_SECRET=...
   ```
4. Run the server
   ```sh
   npm run dev
   ```
## Notes

- `.env`'s `ENVIRONMENT` is either `development` or `production`
- Make sure to migrate if necessary
  ```sh
  npm run prisma migrate dev
  ```
  or
  ```sh
  npm run prisma migrate deploy
  ```