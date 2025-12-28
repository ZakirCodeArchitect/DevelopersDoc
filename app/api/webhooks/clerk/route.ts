import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { syncUserFromClerk, deleteUserByClerkId } from '@/lib/users';

export async function POST(req: Request) {
  // IMPORTANT: Make sure to install svix: npm install svix
  // Get the Svix headers for verification
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Get the webhook secret from environment variables
  // You can find this in your Clerk Dashboard > Webhooks > [Your Webhook] > Signing Secret
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add WEBHOOK_SECRET from Clerk Dashboard to .env.local');
  }

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occurred', {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    
    try {
      await syncUserFromClerk({
        id,
        email_addresses: email_addresses || [],
        first_name,
        last_name,
        image_url,
      });
      console.log(`User ${eventType}:`, id);
    } catch (error) {
      console.error(`Error syncing user ${eventType}:`, error);
      return new Response(`Error syncing user: ${error}`, {
        status: 500,
      });
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;
    
    if (id) {
      try {
        await deleteUserByClerkId(id);
        console.log('User deleted:', id);
      } catch (error) {
        console.error('Error deleting user:', error);
        // User might not exist in our DB, which is fine
        // Continue to return 200 to acknowledge the webhook
      }
    }
  }

  return new Response('', { status: 200 });
}

