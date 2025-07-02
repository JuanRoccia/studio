// src/lib/twitter.ts
'use server';

import { cookies } from 'next/headers';

// Tipo para los tokens
interface TwitterTokens {
  accessToken: string;
  refreshToken?: string;
}

// Función para importar dinámicamente TwitterApi
async function getTwitterApi() {
  const { TwitterApi } = await import('twitter-api-v2');
  return TwitterApi;
}

export async function generateAuthLink() {
  try {
    const TwitterApi = await getTwitterApi();
    
    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    if (!clientId || !clientSecret || !baseUrl) {
      throw new Error('Missing required environment variables for Twitter auth.');
    }

    const callbackUrl = `${baseUrl}/api/twitter/callback`;

    const client = new TwitterApi({
      clientId,
      clientSecret,
    });

    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
      callbackUrl,
      {
        scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
      }
    );

    return {
      url,
      codeVerifier,
      state,
    };
  } catch (error) {
    console.error('Error generating auth link:', error);
    throw new Error('Failed to generate authentication link. Check server logs for details.');
  }
}

export async function loginWithPKCE(code: string, codeVerifier: string) {
  try {
    const TwitterApi = await getTwitterApi();
    
    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    if (!clientId || !clientSecret || !baseUrl) {
      throw new Error('Missing required environment variables for Twitter login.');
    }

    const callbackUrl = `${baseUrl}/api/twitter/callback`;

    const client = new TwitterApi({
      clientId,
      clientSecret,
    });

    const { accessToken, refreshToken } = await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: callbackUrl,
    });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error('Error in loginWithPKCE:', error);
    throw new Error('Failed to complete OAuth login with Twitter.');
  }
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

export async function getAuthenticatedTwitterClient() {
  const existingTokens = await getTokens();
  if (!existingTokens?.accessToken) {
      throw new Error('User is not authenticated with Twitter.');
  }
  
  const { accessToken, refreshToken } = existingTokens;

  const TwitterApi = await getTwitterApi();
  const client = new TwitterApi(accessToken);

  try {
    await client.v2.me({ 'user.fields': ['id'] });
    return { client };
  } catch (error: any) {
    if (error?.code !== 401 || !refreshToken) {
      if(error?.code === 401) {
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

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
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
