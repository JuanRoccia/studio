// src/lib/twitter.ts
import { cookies } from 'next/headers';

interface TwitterTokens {
  accessToken: string;
  refreshToken?: string;
}

// Caché para la clase TwitterApi para evitar importaciones dinámicas repetidas.
let TwitterApiClass: any = null;

// Función para obtener la clase TwitterApi con almacenamiento en caché
async function getTwitterApiClass() {
  if (!TwitterApiClass) {
    const { TwitterApi } = await import('twitter-api-v2');
    TwitterApiClass = TwitterApi;
  }
  return TwitterApiClass;
}

// Función helper para crear una instancia de TwitterApi
async function createTwitterClient(config: { clientId: string; clientSecret: string } | string) {
  const TwitterApi = await getTwitterApiClass();
  return new TwitterApi(config);
}

// Función para generar el enlace de autorización
export async function generateAuthLink() {
  console.log('Environment check:', {
    clientId: !!process.env.TWITTER_CLIENT_ID,
    clientSecret: !!process.env.TWITTER_CLIENT_SECRET,
    baseUrl: !!process.env.NEXT_PUBLIC_BASE_URL
  });
  console.log('[Twitter Lib] generateAuthLink: Generating authorization link...');
  
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  console.log('Environment check:', {
    clientId: !!clientId,
    clientSecret: !!clientSecret,
    baseUrl: !!baseUrl
  });

  if (!clientId || !clientSecret || !baseUrl) {
    console.error('[Twitter Lib] generateAuthLink: Missing required environment variables.');
    throw new Error('Missing required environment variables for Twitter auth.');
  }

  try {
    const client = await createTwitterClient({ clientId, clientSecret });
    const callbackUrl = `${baseUrl}/api/twitter/callback`;
    const scopes = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'];
    
    console.log(`[Twitter Lib] generateAuthLink: Using callback URL: ${callbackUrl}`);
    console.log(`[Twitter Lib] generateAuthLink: Requesting scopes: ${scopes.join(', ')}`);
    
    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(callbackUrl, {
      scope: scopes,
    });

    console.log(`[Twitter Lib] generateAuthLink: Successfully generated link. State: ${state}`);
    return { url, codeVerifier, state };
  } catch (error) {
    console.error('[Twitter Lib] generateAuthLink: Error:', error);
    throw error;
  }
}

// Función para intercambiar el código por tokens
export async function exchangeCodeForTokens(code: string, codeVerifier: string) {
  console.log('[Twitter Lib] exchangeCodeForTokens: Starting token exchange...');
  
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (!clientId || !clientSecret || !baseUrl) {
    throw new Error('Missing required environment variables for Twitter auth.');
  }
  
  try {
    const client = await createTwitterClient({ clientId, clientSecret });
    const callbackUrl = `${baseUrl}/api/twitter/callback`;

    console.log(`[Twitter Lib] exchangeCodeForTokens: Using callback URL for exchange: ${callbackUrl}`);
    
    const { accessToken, refreshToken, expiresIn, scope } = await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: callbackUrl,
    });

    console.log('[Twitter Lib] exchangeCodeForTokens: Token exchange successful.');
    console.log('[Twitter Lib] exchangeCodeForTokens: Received scopes:', scope);

    if (!scope.includes('tweet.write')) {
      console.warn('[Twitter Lib] exchangeCodeForTokens: WARNING - "tweet.write" scope is missing. Publishing will fail.');
    }

    return { accessToken, refreshToken, expiresIn, scope };
  } catch (error) {
    console.error('[Twitter Lib] exchangeCodeForTokens: Error:', error);
    throw error;
  }
}

// Función para obtener información del usuario
export async function getTwitterUser(accessToken: string) {
  console.log('[Twitter Lib] getTwitterUser: Fetching user data...');
  
  try {
    const client = await createTwitterClient(accessToken);
    const user = await client.v2.me({ 'user.fields': ['profile_image_url'] });
    
    console.log(`[Twitter Lib] getTwitterUser: Successfully fetched user: ${user.data.username}`);
    return user;
  } catch (error) {
    console.error('[Twitter Lib] getTwitterUser: Error:', error);
    throw error;
  }
}

// Función para refrescar tokens
export async function refreshTwitterTokens(refreshToken: string) {
  console.log('[Twitter Lib] refreshTwitterTokens: Attempting to refresh tokens...');
  
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing required environment variables for Twitter auth.');
  }

  try {
    const client = await createTwitterClient({ clientId, clientSecret });
    const { accessToken, refreshToken: newRefreshToken } = await client.refreshOAuth2Token(refreshToken);
    
    console.log('[Twitter Lib] refreshTwitterTokens: Successfully refreshed tokens.');
    return { accessToken, refreshToken: newRefreshToken };
  } catch (error) {
    console.error('[Twitter Lib] refreshTwitterTokens: Error:', error);
    throw error;
  }
}

// Función para obtener cliente autenticado 
export async function getAuthenticatedTwitterClient() {
  console.log('[Twitter Lib] getAuthenticatedTwitterClient: Getting authenticated client...');
  
  const tokens = getTwitterTokensFromCookies();
  if (!tokens?.accessToken) {
    throw new Error('No Twitter access token found. Please connect your Twitter account first.');
  }

  try {
    const client = await createTwitterClient(tokens.accessToken);
    return { client, tokens };
  } catch (error) {
    console.error('[Twitter Lib] getAuthenticatedTwitterClient: Error:', error);
    throw error;
  }
}

// Función para publicar un tweet
export async function publishTweet(text: string, accessToken: string) {
  console.log(`[Twitter Lib] publishTweet: Attempting to publish tweet with length ${text.length}`);
  
  try {
    const client = await createTwitterClient(accessToken);
    const result = await client.v2.tweet(text);
    
    console.log('[Twitter Lib] publishTweet: Successfully published tweet.');
    return result;
  } catch (error) {
    console.error('[Twitter Lib] publishTweet: Error:', error);
    throw error;
  }
}

// Función para obtener tokens de las cookies
export function getTwitterTokensFromCookies(): TwitterTokens | null {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('twitter_access_token')?.value;
    const refreshToken = cookieStore.get('twitter_refresh_token')?.value;

    if (!accessToken) {
      console.log('[Twitter Lib] getTwitterTokensFromCookies: No access token found.');
      return null;
    }
    
    console.log('[Twitter Lib] getTwitterTokensFromCookies: Found tokens in cookies.');
    return { accessToken, refreshToken };
  } catch (error) {
    console.error('[Twitter Lib] getTwitterTokensFromCookies: Error:', error);
    return null;
  }
}

// Función para guardar tokens en cookies
export function saveTwitterTokensToCookies(tokens: TwitterTokens) {
  console.log('[Twitter Lib] saveTwitterTokensToCookies: Saving tokens to cookies...');
  
  try {
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
  } catch (error) {
    console.error('[Twitter Lib] saveTwitterTokensToCookies: Error:', error);
    throw error;
  }
}

// Función para limpiar tokens
export function clearTwitterTokens() {
  console.log('[Twitter Lib] clearTwitterTokens: Clearing all twitter-related cookies.');
  
  try {
    const cookieStore = cookies();
    cookieStore.delete('twitter_access_token');
    cookieStore.delete('twitter_refresh_token');
    cookieStore.delete('twitter_state');
    cookieStore.delete('twitter_code_verifier');
  } catch (error) {
    console.error('[Twitter Lib] clearTwitterTokens: Error:', error);
    throw error;
  }
}
