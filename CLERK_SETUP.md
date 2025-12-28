# Clerk User Sync Setup

This document explains how to set up user synchronization between Clerk and your database.

## Overview

When users sign up or sign in with Clerk, their information is automatically synced to your database through webhooks. This allows you to:
- Store user information in your own database
- Query users directly from your database
- Add custom user attributes if needed

## Prerequisites

1. Install the required dependency:
```bash
npm install svix
```

2. Make sure you have run database migrations to create the User table:
```bash
npm run db:push
# or
npm run db:migrate
```

## Setup Steps

### 1. Configure Webhook in Clerk Dashboard

1. Go to your [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Webhooks** in the sidebar
3. Click **Add Endpoint**
4. Enter your webhook URL:
   - **Development**: `http://localhost:3000/api/webhooks/clerk` (or use a tool like [ngrok](https://ngrok.com) for testing)
   - **Production**: `https://yourdomain.com/api/webhooks/clerk`
5. Select the following events to subscribe to:
   - `user.created`
   - `user.updated`
   - `user.deleted`
6. Copy the **Signing Secret** (starts with `whsec_`)

### 2. Add Environment Variable

Add the webhook secret to your `.env.local` file:

```env
WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**Important**: Never commit this secret to version control. It should only be in `.env.local` (which should be in `.gitignore`).

### 3. Test the Webhook

1. Start your development server:
```bash
npm run dev
```

2. Sign up a new user in your application
3. Check your database - the user should be automatically created

## How It Works

### Webhook Flow

1. User signs up/signs in via Clerk
2. Clerk sends a webhook event to `/api/webhooks/clerk`
3. The webhook handler verifies the request signature
4. User data is synced to your database:
   - `user.created` - Creates a new user record
   - `user.updated` - Updates existing user record
   - `user.deleted` - Deletes user record

### Database Schema

The User model includes:
- `id` - UUID primary key
- `clerkId` - Unique Clerk user ID
- `email` - User's email address
- `firstName` - User's first name (optional)
- `lastName` - User's last name (optional)
- `imageUrl` - User's profile image URL (optional)
- `createdAt` - Timestamp when user was created
- `updatedAt` - Timestamp when user was last updated

## Usage in Your Code

### Get User by Clerk ID

```typescript
import { getUserByClerkId } from '@/lib/users';

const user = await getUserByClerkId('user_xxxxxxxxxxxxx');
```

### Get Current User

```typescript
import { currentUser } from '@clerk/nextjs/server';
import { getUserByClerkId } from '@/lib/users';

const clerkUser = await currentUser();
if (clerkUser) {
  const user = await getUserByClerkId(clerkUser.id);
}
```

### Sync Current User (Fallback)

If webhooks are not configured, you can sync users on-demand:

```typescript
import { syncCurrentUser } from '@/lib/users';

const user = await syncCurrentUser();
```

## Troubleshooting

### Webhook Not Receiving Events

1. Check that your webhook URL is correct in Clerk Dashboard
2. Verify that `WEBHOOK_SECRET` is set correctly in `.env.local`
3. Check your server logs for webhook errors
4. For local development, use ngrok or similar tool to expose your local server

### Users Not Appearing in Database

1. Verify database migrations have been run
2. Check webhook logs in Clerk Dashboard
3. Check server console for errors
4. Verify the webhook endpoint is accessible

### TypeScript Errors

If you see TypeScript errors related to the User model, regenerate Prisma client:

```bash
npm run db:generate
```

