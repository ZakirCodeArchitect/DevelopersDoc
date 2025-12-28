# Database Migration Guide

This project has been migrated from using a JSON file (`data/docs.json`) to using a PostgreSQL database with Prisma ORM.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `@prisma/client` - Prisma client for database operations
- `prisma` - Prisma CLI for migrations and schema management
- `pg` - PostgreSQL client
- `tsx` - TypeScript execution for migration scripts

### 2. Set Up Database

1. Create a PostgreSQL database (locally or using a service like Supabase, Railway, etc.)

2. Create a `.env` file in the root directory with your database connection string:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/developers_doc"
```

Replace `user`, `password`, `localhost`, `5432`, and `developers_doc` with your actual database credentials.

### 3. Initialize Database Schema

Run Prisma to generate the client and push the schema to your database:

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database (creates tables)
npm run db:push
```

Alternatively, you can use migrations:

```bash
npm run db:migrate
```

### 4. Migrate Existing Data (Optional)

If you have existing data in `data/docs.json`, you can migrate it to the database:

```bash
npx tsx scripts/migrate-json-to-db.ts
```

This script will:
- Read all data from `data/docs.json`
- Create projects, documents, pages, and sections in the database
- Use `upsert` operations, so it's safe to run multiple times

### 5. Verify Setup

You can open Prisma Studio to view your data:

```bash
npm run db:studio
```

This will open a web interface at `http://localhost:5555` where you can browse your database.

## Database Schema

The database has the following structure:

- **Project**: Contains projects with multiple documents
- **Document**: Can belong to a project or be standalone ("Your Docs")
- **Page**: Belongs to a document, contains multiple sections
- **Section**: Belongs to a page, contains the actual content

## API Changes

All API routes now use the database instead of the JSON file:

- `POST /api/projects` - Create project
- `PATCH /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project
- `POST /api/docs` - Create document
- `PATCH /api/docs/[id]` - Update document
- `DELETE /api/docs/[id]` - Delete document
- `POST /api/docs/[id]/sections` - Add page to document
- `PATCH /api/docs/[id]/pages/[pageId]` - Update page content

## Development

During development, the database connection is cached globally to prevent connection exhaustion. The Prisma client is automatically instantiated in `lib/db.ts`.

## Production

Make sure to:
1. Set `DATABASE_URL` environment variable in your production environment
2. Run `npm run db:generate` during build
3. Run migrations if using `db:migrate` instead of `db:push`

## Troubleshooting

### Connection Issues

- Verify your `DATABASE_URL` is correct
- Check that your database server is running
- Ensure your database user has the necessary permissions

### Migration Issues

- If migration fails, check the error message
- The migration script uses `upsert`, so you can safely re-run it
- Make sure your database schema matches the Prisma schema

### Type Errors

- Run `npm run db:generate` after schema changes
- Restart your TypeScript server in your IDE

