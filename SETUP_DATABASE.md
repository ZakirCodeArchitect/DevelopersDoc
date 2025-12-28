# Database Setup Guide for Supabase

## Step 1: Get Your Supabase Connection Strings

You need **two** connection strings from Supabase:

1. In your Supabase dashboard, click on **Settings** (gear icon) → **Database**
2. Click on **Connection string** tab
3. You'll need both:

   **a) Direct Connection (for Prisma CLI):**
   - Select **Method**: "Direct connection"
   - Copy the URI connection string
   - Format: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
   
   **b) Transaction Pooler (for Application Runtime):**
   - Select **Method**: "Transaction pooler"
   - Copy the URI connection string  
   - Format: `postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-[REGION].pooler.supabase.com:6543/postgres`

**Why two connections?**
- **Direct connection**: Better for Prisma migrations, schema operations, and CLI tools
- **Session pooler**: Better for application runtime, especially in serverless environments (Vercel, etc.)
  - Supports prepared statements (required by Prisma)
  - Handles connection pooling efficiently

## Step 2: Create .env File

Create a `.env` file in the root of your project with **both** connection strings:

```env
# Session pooler - for application runtime (supports prepared statements, IPv4 compatible)
DATABASE_URL="postgresql://postgres.kbuyvivqoszsrwruwriu:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

# Direct connection - for Prisma CLI operations (migrations, db push, generate)
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.kbuyvivqoszsrwruwriu.supabase.co:5432/postgres"
```

**Important Notes:**
- **DATABASE_URL**: Use the **Session pooler** connection string from Supabase (NOT Transaction pooler)
  - Session pooler supports prepared statements (required by Prisma)
  - This is for your application runtime (better for serverless, handles connection pooling)
  - Format: `postgresql://postgres.PROJECT_REF:[PASSWORD]@aws-REGION.pooler.supabase.com:5432/postgres`
  - ⚠️ **Important**: Use port **5432** (Session pooler), NOT 6543 (Transaction pooler)
  
- **DIRECT_URL**: Use the **Direct connection** connection string from Supabase
  - This is for Prisma CLI operations (migrations, `db push`, `db generate`)
  - Format: `postgresql://postgres:[PASSWORD]@db.PROJECT_REF.supabase.co:5432/postgres`

**How to get both:**
1. In Supabase dashboard → Settings → Database → Connection string
2. **For DATABASE_URL**: Select "Session pooler" method (NOT Transaction pooler), copy the URI
3. **For DIRECT_URL**: Select "Direct connection" method, copy the URI
4. Replace `[YOUR-PASSWORD]` with your actual database password in both

**Why Session pooler instead of Transaction pooler?**
- Prisma uses prepared statements, which Transaction pooler doesn't support
- Session pooler supports prepared statements and works perfectly with Prisma
- Both are IPv4 compatible and work well in serverless environments

**Example:**
```env
DATABASE_URL="postgresql://postgres.kbuyvivqoszsrwruwriu:MyPassword123@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres:MyPassword123@db.kbuyvivqoszsrwruwriu.supabase.co:5432/postgres"
```

## Step 3: Install Dependencies

Make sure all dependencies are installed:

```bash
npm install
```

## Step 4: Generate Prisma Client

Generate the Prisma client based on your schema:

```bash
npm run db:generate
```

## Step 5: Push Schema to Database

Push your Prisma schema to create all the tables in Supabase:

```bash
npm run db:push
```

This will create the following tables in your Supabase database:
- `projects`
- `documents`
- `pages`
- `sections`

## Step 6: (Optional) Migrate Existing Data

If you have existing data in `data/docs.json`, you can migrate it to the database:

```bash
npx tsx scripts/migrate-json-to-db.ts
```

## Step 7: Verify Setup

You can verify your database setup by:

1. **Using Prisma Studio** (visual database browser):
   ```bash
   npm run db:studio
   ```
   This opens a web interface at `http://localhost:5555` where you can browse your database.

2. **Check Supabase Dashboard**:
   - Go to **Table Editor** in your Supabase dashboard
   - You should see the 4 tables: `projects`, `documents`, `pages`, `sections`

## Troubleshooting

### Connection Issues

- **Error: Can't reach database server**
  - Check your `DATABASE_URL` is correct
  - Make sure your Supabase project is active
  - Verify your password is correct (no special characters need URL encoding)

- **Error: Password authentication failed**
  - Double-check your password in the connection string
  - You can reset your database password in Supabase Settings → Database

- **Error: Database does not exist**
  - Make sure you're using the correct database name (usually `postgres`)

### Schema Issues

- **Error: Table already exists**
  - If tables already exist, you can either:
    - Drop them manually in Supabase SQL Editor
    - Use `prisma migrate reset` (⚠️ This will delete all data)

### Quick Test

After setup, try running your dev server:

```bash
npm run dev
```

If everything is connected correctly, your app should start without database errors.

