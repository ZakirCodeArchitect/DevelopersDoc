import { cache } from 'react';
import { prisma } from './db';
import { auth, currentUser } from '@clerk/nextjs/server';
import { acceptPendingShares } from './shares';

export interface ClerkUserData {
  id: string;
  email_addresses: Array<{ email_address: string }>;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
}

/**
 * Sync user data from Clerk to the database
 * Creates a new user if they don't exist, or updates existing user
 * Also accepts any pending share invitations for this user
 */
export async function syncUserFromClerk(clerkUser: ClerkUserData) {
  const email = clerkUser.email_addresses[0]?.email_address;
  if (!email) {
    throw new Error('User email is required');
  }

  const isNewUser = !(await prisma.user.findUnique({ where: { clerkId: clerkUser.id } }));

  const user = await prisma.user.upsert({
    where: { clerkId: clerkUser.id },
    update: {
      email,
      firstName: clerkUser.first_name || null,
      lastName: clerkUser.last_name || null,
      imageUrl: clerkUser.image_url || null,
      updatedAt: new Date(),
    },
    create: {
      clerkId: clerkUser.id,
      email,
      firstName: clerkUser.first_name || null,
      lastName: clerkUser.last_name || null,
      imageUrl: clerkUser.image_url || null,
    },
  });

  // If this is a new user or email changed, accept any pending shares
  if (isNewUser || user.email !== email) {
    await acceptPendingShares(user.email, user.id);
  }

  return user;
}

/**
 * Get user by Clerk ID
 */
export async function getUserByClerkId(clerkId: string) {
  return prisma.user.findUnique({
    where: { clerkId },
  });
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  return prisma.user.findFirst({
    where: { email },
  });
}

/**
 * Delete user by Clerk ID
 */
export async function deleteUserByClerkId(clerkId: string) {
  return prisma.user.delete({
    where: { clerkId },
  });
}

/**
 * Sync the current authenticated user from Clerk session
 * This can be used as a fallback if webhooks are not configured
 * or for development purposes
 */
export async function syncCurrentUser() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return null;
    }

    return await syncUserFromClerk({
      id: clerkUser.id,
      email_addresses: clerkUser.emailAddresses.map((email) => ({
        email_address: email.emailAddress,
      })),
      first_name: clerkUser.firstName,
      last_name: clerkUser.lastName,
      image_url: clerkUser.imageUrl,
    });
  } catch (error) {
    console.error('Error syncing current user:', error);
    return null;
  }
}

/**
 * Get the authenticated Clerk userId from the current session.
 * Cached per-request so multiple checks in layout/page share one auth lookup.
 */
export const getAuthenticatedClerkUserId = cache(async () => {
  const { userId } = await auth();
  return userId;
});

/**
 * Get the current authenticated user from the database.
 * Syncs the user if they don't exist yet.
 * Wrapped in React cache() so layout + page (and multiple callers in one request) share one DB round-trip.
 */
export const getCurrentUser = cache(async () => {
  try {
    const clerkUserId = await getAuthenticatedClerkUserId();
    if (!clerkUserId) {
      return null;
    }

    let user = await getUserByClerkId(clerkUserId);
    if (!user) {
      // Only hit Clerk's full user API if DB user doesn't exist yet.
      const clerkUser = await currentUser();
      if (!clerkUser) {
        return null;
      }
      user = await syncUserFromClerk({
        id: clerkUser.id,
        email_addresses: clerkUser.emailAddresses.map((email) => ({
          email_address: email.emailAddress,
        })),
        first_name: clerkUser.firstName,
        last_name: clerkUser.lastName,
        image_url: clerkUser.imageUrl,
      });
    }

    return user;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error getting current user:', error);
    }
    return null;
  }
});

