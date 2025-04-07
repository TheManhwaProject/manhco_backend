# Prisma Multischema Troubleshooting Guide

## Common Error
If you encounter an error like:
```
no such table at waiting_list.waitlist_entry
```

This indicates that the database schema hasn't been properly synchronized with your Prisma schema definition.

## Step-by-Step Resolution

### 1. Verify Your Prisma Schema Configuration

Ensure your schema.prisma file has:

```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["multiSchema"]  // This is essential for multischema support
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["manhco", "waiting_list"]  // Define all schemas your app will use
}

// Model example
model WaitlistEntry {
  // fields...
  
  @@schema("waiting_list")  // Specify which schema this model belongs to
  @@map("waitlist_entry")   // Specify the actual table name in the database
}
```

### 2. Sync the Database Schema

Once your Prisma schema is correctly configured, use the following command to push the changes to the database:

```bash
npx prisma db push
```

This command:
- Creates any missing schemas 
- Creates any missing tables
- Updates existing tables with new columns/constraints

### 3. Regenerate Prisma Client

After updating the database schema, regenerate the Prisma client:

```bash
npx prisma generate
```

### 4. Restart Your Application

Restart your application to use the updated Prisma client:

```bash
npm run dev
```

## Troubleshooting Additional Issues

### Permission Error with Prisma Client

If you see an error like:
```
EPERM: operation not permitted, rename '...\node_modules\.prisma\client\query_engine-windows.dll.node.tmp...'
```

Try:
1. Close all running instances of your application
2. Delete the `.prisma` folder in your node_modules
3. Run `npx prisma generate` again

### Database Migration Conflict

If you see drift or migration conflict messages:

```
Drift detected: Your database schema is not in sync with your migration history.
```

For development environments, you can reset the database:
```bash
npx prisma db push --force-reset
```
⚠️ Warning: This will delete all data in the database.

### Checking Database Content

To verify your data is correctly stored in the database:

```javascript
// Create a check-db.js file with this content
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const entries = await prisma.waitlistEntry.findMany();
    console.log('Entries:');
    console.log(JSON.stringify(entries, null, 2));
    console.log(`Total entries: ${entries.length}`);
  } catch (error) {
    console.error('Error fetching entries:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
```

Then run:
```bash
node check-db.js
```

## Prevention

1. Always run `npx prisma db push` after changing your Prisma schema
2. Use Prisma Migrate for production environments
3. Include the multischema setup in your CI/CD pipeline tests 