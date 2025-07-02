'use server';

import { cookies } from 'next/headers';

export async function generateAuthLink() {
  const { TwitterApi } = await import('twitter-api-v2');
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (!clientId || !clientSecret || !baseUrl) {
    throw new Error('Missing Twitter environment variables. Please check your .env file.');
  }

  const client = new TwitterApi({ clientId, clientSecret });
  
  const CALLBACK_URL = `${baseUrl}/api/twitter/callback`;
  const { url, codeVerifier, state } = client.generateOAuth2AuthLink(CALLBACK_URL, {
    scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
  });

  return { authUrl: url, codeVerifier, state };
}

export async function loginWithPKCE(code: string, codeVerifier: string) {
    const { TwitterApi } = await import('twitter-api-v2');
    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    if (!clientId || !clientSecret || !baseUrl) {
        throw new Error('Missing Twitter environment variables. Please check your .env file.');
    }

    const client = new TwitterApi({ clientId, clientSecret });
    const CALLBACK_URL = `${baseUrl}/api/twitter/callback`;

    const { accessToken, refreshToken } = await client.loginWithPKCE({
        code,
        codeVerifier,
        redirectUri: CALLBACK_URL,
    });

    return { accessToken, refreshToken };
}


export function getTokens(): { accessToken?: string; refreshToken?: string; } {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('twitter_access_token')?.value;
  const refreshToken = cookieStore.get('twitter_refresh_token')?.value;

  return { accessToken, refreshToken };
}

export async function getAuthenticatedTwitterClient(accessToken?: string, refreshToken?: string) {
    const { TwitterApi } = await import('twitter-api-v2');

    if (!accessToken || !refreshToken) {
        throw new Error('No access token or refresh token provided.');
    }
    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Missing Twitter app environment variables on the server.');
    }

    const client = new TwitterApi({ 
      clientId,
      clientSecret,
      accessToken, 
      refreshToken 
    });

    try {
        await client.v2.me({ 'user.fields': ['id'] });
        return { client, refreshed: undefined };
    } catch (error: any) {
        if (error?.code !== 401) {
            console.error('An unexpected error occurred with the Twitter API:', error);
            throw error;
        }

        console.log('Access token may be expired, attempting to refresh...');
        try {
            const { client: refreshedClient, accessToken: newAccessToken, refreshToken: newRefreshToken } = await client.refreshOAuth2Token();
            
            const refreshed = {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            };
            
            console.log('Twitter token refreshed successfully.');
            return { client: refreshedClient, refreshed };
        } catch (refreshError: any) {
            console.error('Could not refresh Twitter token:', refreshError);
            throw new Error('Twitter authentication has expired. Please disconnect and reconnect your account.');
        }
    }
}
