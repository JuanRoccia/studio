// src/app/actions/twitter-actions.ts
'use server';

import {
  getTokensFromCookies,
  getAuthenticatedTwitterClient,
  clearTokensInCookies,
} from '@/lib/twitter';
import { revalidatePath } from 'next/cache';

/**
 * Checks if a user is currently connected to Twitter by validating their tokens.
 */
export async function checkTwitterConnection() {
  const tokens = getTokensFromCookies();
  if (!tokens?.accessToken) {
    return { isConnected: false };
  }

  try {
    const { client } = await getAuthenticatedTwitterClient();
    const user = await client.v2.me({ 'user.fields': ['profile_image_url'] });
    return {
      isConnected: true,
      user: {
        id: user.data.id,
        username: user.data.username,
        name: user.data.name,
        profile_image_url: user.data.profile_image_url,
      },
    };
  } catch (error) {
    console.error('Error checking Twitter connection status:', error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to verify connection. Please try reconnecting.';
    return {
      isConnected: false,
      error: errorMessage,
    };
  }
}

/**
 * Disconnects the user's Twitter account by clearing authentication cookies.
 */
export async function disconnectTwitter() {
  clearTokensInCookies();
  revalidatePath('/dashboard/publisher');
  return { success: true };
}
