import { prisma } from './db';
import { currentUser } from '@clerk/nextjs/server';
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
 * Get the current authenticated user from the database
 * Syncs the user if they don't exist yet
 */
export async function getCurrentUser() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return null;
    }

    // Try to get user from database
    let user = await getUserByClerkId(clerkUser.id);
    
    // If user doesn't exist, sync them
    if (!user) {
      user = await syncCurrentUser();
    }

    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

