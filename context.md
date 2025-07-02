src/lib/twitter.ts:

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


export async function getTokens(): Promise<{ accessToken?: string; refreshToken?: string; }> {
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

    const client = new TwitterApi(accessToken);

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
            const appClient = new TwitterApi({ clientId, clientSecret });
            
            const {
              client: refreshedClient,
              accessToken: newAccessToken,
              refreshToken: newRefreshToken
            } = await appClient.refreshOAuth2Token(refreshToken);

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

src/app/api/twitter/auth/route.ts:
// src/app/api/twitter/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateAuthLink } from '@/lib/twitter';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const { authUrl, codeVerifier, state } = await generateAuthLink();
    
    // Store codeVerifier and state in cookies to verify them in the callback
    cookies().set('twitter_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: true,
      path: '/',
      maxAge: 60 * 15, // 15 minutes
    });
    cookies().set('twitter_state', state, {
      httpOnly: true,
      secure: true,
      path: '/',
      maxAge: 60 * 15, // 15 minutes
    });

    return NextResponse.redirect(authUrl);

  } catch (error) {
    console.error("Error in Twitter auth route:", error);
    const errorMessage = (error instanceof Error) ? error.message : 'An unknown error occurred.';
    return new NextResponse(`Authentication failed: ${errorMessage}`, { status: 500 });
  }
}

src/app/api/twitter/callback/route.ts:
// src/app/api/twitter/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { loginWithPKCE } from '@/lib/twitter';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const state = searchParams.get('state');
    const code = searchParams.get('code');

    const storedState = cookies().get('twitter_state')?.value;
    const storedCodeVerifier = cookies().get('twitter_code_verifier')?.value;

    if (!state || !code || !storedState || !storedCodeVerifier || state !== storedState) {
      return new Response('Invalid request: state mismatch or missing parameters.', { status: 400 });
    }

    const { accessToken, refreshToken } = await loginWithPKCE(code, storedCodeVerifier);

    const oneDay = 24 * 60 * 60 * 1000;
    
    // Store the tokens securely in httpOnly cookies
    cookies().set('twitter_access_token', accessToken, {
      httpOnly: true,
      secure: true,
      path: '/',
      expires: Date.now() + 7 * oneDay, // 7 days
    });
    if (refreshToken) {
      cookies().set('twitter_refresh_token', refreshToken, {
        httpOnly: true,
        secure: true,
        path: '/',
        expires: Date.now() + 30 * oneDay, // 30 days
      });
    }

    // Clean up temporary cookies
    cookies().delete('twitter_state');
    cookies().delete('twitter_code_verifier');
    
    // Get the language from the last visited path
    const lang = req.headers.get('referer')?.split('/')[3] || 'en';

    // Redirect user back to the publisher page
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/${lang}/dashboard/publisher`);
  
  } catch (error) {
    console.error("Twitter callback error:", error);
    const errorMessage = (error instanceof Error) ? error.message : 'An unknown error occurred.';
    return new NextResponse(`Authentication callback failed: ${errorMessage}`, { status: 500 });
  }
}

no hay status