// src/lib/twitter.ts
'use server';

import { cookies } from 'next/headers';
import type { TwitterApi } from 'twitter-api-v2';

interface TwitterTokens {
  accessToken: string;
  refreshToken?: string;
}

async function getTwitterApi() {
  // This dynamic import is critical to prevent Next.js server-side initialization issues.
  const { TwitterApi } = await import('twitter-api-v2');
  return TwitterApi;
}

export async function generateAuthLink() {
  const TwitterApi = await getTwitterApi();
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (!clientId || !clientSecret || !baseUrl) {
    throw new Error('Missing required environment variables for Twitter auth.');
  }

  const client = new TwitterApi({ clientId, clientSecret });
  const callbackUrl = `${baseUrl}/api/twitter/callback`;
  const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
    callbackUrl,
    {
      scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    }
  );

  return { url, codeVerifier, state };
}

export async function loginWithPKCE(code: string, codeVerifier: string) {
  const TwitterApi = await getTwitterApi();
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (!clientId || !clientSecret || !baseUrl) {
    throw new Error('Missing required environment variables for Twitter login.');
  }

  const client = new TwitterApi({ clientId, clientSecret });
  const callbackUrl = `${baseUrl}/api/twitter/callback`;
  const { accessToken, refreshToken } = await client.loginWithOAuth2({
    code,
    codeVerifier,
    redirectUri: callbackUrl,
  });

  return { accessToken, refreshToken };
}


export async function getTokens(): Promise<TwitterTokens | null> {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('twitter_access_token')?.value;
  const refreshToken = cookieStore.get('twitter_refresh_token')?.value;

  if (!accessToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

export async function getAuthenticatedTwitterClient(): Promise<{ client: TwitterApi }> {
    const existingTokens = await getTokens();
    if (!existingTokens?.accessToken) {
        throw new Error('User is not authenticated with Twitter.');
    }
  
    const { accessToken, refreshToken } = existingTokens;

    const TwitterApi = await getTwitterApi();
    const client = new TwitterApi(accessToken);

    try {
        // Make a simple request to check if the token is valid
        await client.v2.me({ 'user.fields': ['id'] });
        return { client };
    } catch (error: any) {
        // If the token is expired (401) and we have a refresh token, try to refresh it
        if (error?.code !== 401 || !refreshToken) {
            // If it's not a 401 error, or if there's no refresh token, we can't recover.
            if (error?.code === 401) {
                console.log("Token invalid and no refresh token available, clearing tokens.");
                await clearTokens();
            }
            console.error('Twitter API error or invalid token:', error);
            throw new Error('Your Twitter session is invalid. Please disconnect and reconnect.');
        }

        console.log('Access token expired, attempting to refresh...');
        try {
            const clientId = process.env.TWITTER_CLIENT_ID;
            const clientSecret = process.env.TWITTER_CLIENT_SECRET;
            if (!clientId || !clientSecret) throw new Error('Missing Twitter app credentials for refresh.');
            
            const appClient = new TwitterApi({ clientId, clientSecret });
            const { client: refreshedClient, accessToken: newAccessToken, refreshToken: newRefreshToken } = await appClient.refreshOAuth2Token(refreshToken);

            // Securely set the new tokens in cookies
            const cookieOptions = {
                httpOnly: true,
                secure: true,
                path: '/',
                maxAge: 60 * 60 * 24 * 90, // 90 days
                sameSite: 'lax' as const,
            };

            cookies().set('twitter_access_token', newAccessToken, cookieOptions);
            if (newRefreshToken) {
                cookies().set('twitter_refresh_token', newRefreshToken, cookieOptions);
            }
            
            console.log('Twitter token refreshed and cookies updated.');
            return { client: refreshedClient };
        } catch (refreshError: any) {
            console.error('Could not refresh Twitter token:', refreshError);
            // If refresh fails, clear the stale tokens
            await clearTokens();
            throw new Error('Your Twitter session has expired. Please disconnect and reconnect.');
        }
    }
}

export async function clearTokens() {
  const cookieStore = cookies();
  cookieStore.delete('twitter_access_token');
  cookieStore.delete('twitter_refresh_token');
}