// src/lib/twitter.ts
import { TwitterApi, type TwitterApiTokens } from 'twitter-api-v2';
import { cookies } from 'next/headers';

/**
 * Generates an authentication client and URL for the Twitter OAuth 2.0 PKCE flow.
 */
export function getTwitterClient() {
  if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET || !process.env.NEXT_PUBLIC_BASE_URL) {
    throw new Error('Missing Twitter environment variables');
  }

  const client = new TwitterApi({
    clientId: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
  });
  
  const CALLBACK_URL = `${process.env.NEXT_PUBLIC_BASE_URL}/api/twitter/callback`;
  const { url, codeVerifier, state } = client.generateOAuth2AuthLink(CALLBACK_URL, {
    scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
  });

  return { client, authUrl: url, codeVerifier, state };
}

/**
 * Retrieves the user's tokens from cookies.
 */
export function getTokens(): Partial<TwitterApiTokens> {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('twitter_access_token')?.value;
  const refreshToken = cookieStore.get('twitter_refresh_token')?.value;

  return { accessToken, refreshToken };
}


/**
 * Creates an authenticated Twitter client for a user, refreshing tokens if necessary.
 * @param accessToken The user's current access token.
 * @param refreshToken The user's refresh token.
 * @returns An object containing the authenticated client and refreshed tokens if any.
 */
export async function getAuthenticatedTwitterClient(accessToken?: string, refreshToken?: string) {
    if (!accessToken || !refreshToken) {
        throw new Error('No access token or refresh token provided.');
    }
    if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
      throw new Error('Missing Twitter app environment variables on the server.');
    }

    const client = new TwitterApi({ 
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
      accessToken, 
      refreshToken 
    });

    let refreshed: Partial<TwitterApiTokens> | undefined;

    try {
        // Check if the token is expired by making a cheap, harmless request.
        await client.v2.me({ 'user.fields': ['id'] });
    } catch (error: any) {
        // If the token is expired (or invalid), try to refresh it.
        if (error?.code === 401) { 
            console.log('Access token expired, attempting to refresh...');
            try {
                const { client: refreshedClient, accessToken: newAccessToken, refreshToken: newRefreshToken } = await client.refreshOAuth2Token();
                
                refreshed = {
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken,
                };
                
                return { client: refreshedClient, refreshed };
            } catch (refreshError) {
                console.error('Could not refresh Twitter token:', refreshError);
                throw new Error('Twitter authentication expired. Please reconnect.');
            }
        }
        // Re-throw other errors
        throw error;
    }

    return { client, refreshed: undefined };
}
