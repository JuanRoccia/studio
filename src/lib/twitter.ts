// This is a PURE server-side library. It should NOT have any "use server" directive.
// It is designed to be imported by API Route Handlers and Server Actions.

import { cookies } from 'next/headers';

interface TwitterTokens {
  accessToken: string;
  refreshToken?: string;
}

// Función para generar el enlace de autorización
export async function generateAuthLink() {
  console.log('[Twitter Lib] generateAuthLink: Generating authorization link...');
  // Import dinámico para evitar errores de inicialización
  const { TwitterApi } = await import('twitter-api-v2');
  
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (!clientId || !clientSecret || !baseUrl) {
    console.error('[Twitter Lib] generateAuthLink: Missing required environment variables.');
    throw new Error('Missing required environment variables for Twitter auth.');
  }

  const client = new TwitterApi({ 
    clientId, 
    clientSecret 
  });

  const callbackUrl = `${baseUrl}/api/twitter/callback`;
  const scopes = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'];
  
  console.log(`[Twitter Lib] generateAuthLink: Using callback URL: ${callbackUrl}`);
  console.log(`[Twitter Lib] generateAuthLink: Requesting scopes: ${scopes.join(', ')}`);
  
  const { url, codeVerifier, state } = client.generateOAuth2AuthLink(callbackUrl, {
    scope: scopes,
  });

  console.log(`[Twitter Lib] generateAuthLink: Successfully generated link. State: ${state}`);
  return { url, codeVerifier, state };
}

// Función para intercambiar el código por tokens
export async function exchangeCodeForTokens(code: string, codeVerifier: string) {
  console.log('[Twitter Lib] exchangeCodeForTokens: Attempting to exchange code for tokens...');
  const { TwitterApi } = await import('twitter-api-v2');
  
  const client = new TwitterApi({
    clientId: process.env.TWITTER_CLIENT_ID!,
    clientSecret: process.env.TWITTER_CLIENT_SECRET!,
  });
  
  const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/twitter/callback`;
  console.log(`[Twitter Lib] exchangeCodeForTokens: Using callback URL for exchange: ${callbackUrl}`);

  const tokenResult = await client.loginWithOAuth2({
    code,
    codeVerifier,
    redirectUri: callbackUrl,
  });
  
  console.log('[Twitter Lib] exchangeCodeForTokens: Received token result from Twitter:', {
      accessToken: tokenResult.accessToken ? '*** (received)' : 'null',
      refreshToken: tokenResult.refreshToken ? '*** (received)' : 'null',
      expiresIn: tokenResult.expiresIn,
      scope: tokenResult.scope,
  });

  return tokenResult;
}

// Función para publicar un tweet
export async function publishTweet(text: string, accessToken: string) {
  console.log(`[Twitter Lib] publishTweet: Attempting to publish tweet with length ${text.length}`);
  const { TwitterApi } = await import('twitter-api-v2');
  
  const client = new TwitterApi(accessToken);
  const result = await client.v2.tweet(text);
  
  console.log('[Twitter Lib] publishTweet: Successfully published tweet.');
  return result;
}

// Función para obtener información del usuario
export async function getTwitterUser(accessToken: string) {
  console.log('[Twitter Lib] getTwitterUser: Fetching user data...');
  const { TwitterApi } = await import('twitter-api-v2');
  
  const client = new TwitterApi(accessToken);
  const user = await client.v2.me({ 'user.fields': ['profile_image_url'] });
  
  console.log(`[Twitter Lib] getTwitterUser: Successfully fetched user: ${user.data.username}`);
  return user;
}

// Función para refrescar tokens
export async function refreshTwitterTokens(refreshToken: string) {
  console.log('[Twitter Lib] refreshTwitterTokens: Attempting to refresh tokens...');
  const { TwitterApi } = await import('twitter-api-v2');
  
  const client = new TwitterApi({
    clientId: process.env.TWITTER_CLIENT_ID!,
    clientSecret: process.env.TWITTER_CLIENT_SECRET!,
  });

  const { accessToken, refreshToken: newRefreshToken } = await client.refreshOAuth2Token(refreshToken);
  
  console.log('[Twitter Lib] refreshTwitterTokens: Successfully refreshed tokens.');
  return { accessToken, refreshToken: newRefreshToken };
}

// Función para obtener tokens de las cookies
export function getTwitterTokensFromCookies(): TwitterTokens | null {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('twitter_access_token')?.value;
  const refreshToken = cookieStore.get('twitter_refresh_token')?.value;

  if (!accessToken) {
    console.log('[Twitter Lib] getTwitterTokensFromCookies: No access token found.');
    return null;
  }
  
  console.log('[Twitter Lib] getTwitterTokensFromCookies: Found tokens in cookies.');
  return { accessToken, refreshToken };
}

// Función para guardar tokens en cookies
export function saveTwitterTokensToCookies(tokens: TwitterTokens) {
  console.log('[Twitter Lib] saveTwitterTokensToCookies: Saving tokens to cookies...');
  const cookieStore = cookies();
  
  cookieStore.set('twitter_access_token', tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 días
  });

  if (tokens.refreshToken) {
    cookieStore.set('twitter_refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 días
    });
  }
  console.log('[Twitter Lib] saveTwitterTokensToCookies: Tokens saved.');
}

// Función para limpiar tokens
export function clearTwitterTokens() {
  console.log('[Twitter Lib] clearTwitterTokens: Clearing all twitter-related cookies.');
  const cookieStore = cookies();
  cookieStore.delete('twitter_access_token');
  cookieStore.delete('twitter_refresh_token');
  cookieStore.delete('twitter_state');
  cookieStore.delete('twitter_code_verifier');
}
