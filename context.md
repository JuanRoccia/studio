ENTORNO DE FIREBASE STUDIO

// src/app/api/twitter/auth/route.ts
import { NextResponse } from 'next/server';
import { generateAuthLink } from '@/lib/twitter';

export async function GET() {
  console.log('[Twitter Auth Route] Received request to start authentication.');
  try {
    // Verificar variables de entorno primero
    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    if (!clientId || !clientSecret || !baseUrl) {
      console.error('[Twitter Auth Route] Missing environment variables:', {
        clientId: !!clientId,
        clientSecret: !!clientSecret,
        baseUrl: !!baseUrl
      });
      return NextResponse.json(
        { 
          error: 'Server configuration error', 
          details: 'Missing required environment variables. Please check your .env file.' 
        },
        { status: 500 }
      );
    }

    const { url, codeVerifier, state } = await generateAuthLink();

    console.log('[Twitter Auth Route] Generated auth link. Redirecting user to Twitter.');
    console.log(`[Twitter Auth Route] State: ${state}`);
    console.log(`[Twitter Auth Route] Code Verifier: ${codeVerifier ? '*** (generated)' : 'null'}`);

    const response = NextResponse.redirect(url);
    
    // Guardar datos temporales en cookies
    response.cookies.set('twitter_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10, // 10 minutos
    });

    response.cookies.set('twitter_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10, // 10 minutos
    });
    
    console.log('[Twitter Auth Route] State and verifier cookies set.');
    return response;
  } catch (error) {
    console.error('[Twitter Auth Route] FATAL: Error generating Twitter auth link:', error);
    
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('[Twitter Auth Route] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }

    return NextResponse.json(
      { error: 'Failed to generate auth link', details: errorMessage },
      { status: 500 }
    );
  }
}
// src/app/api/twitter/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, saveTwitterTokensToCookies } from '@/lib/twitter';

export async function GET(request: NextRequest) {
  console.log('[Twitter Callback Route] Received callback from Twitter.');
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const redirectBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const lang = request.cookies.get('NEXT_LOCALE')?.value || 'en';
  const finalRedirectUrl = new URL(`/${lang}/dashboard/publisher`, redirectBaseUrl);

  console.log('[Twitter Callback Route] Received query params:', { code, state, error, errorDescription });

  // Verificar si hay error de Twitter
  if (error) {
    console.error(`[Twitter Callback Route] Twitter returned an error: ${error} - ${errorDescription}`);
    finalRedirectUrl.searchParams.set('error', 'twitter_auth_denied');
    finalRedirectUrl.searchParams.set('details', `Twitter reported an error: ${error_description || error}`);
    return NextResponse.redirect(finalRedirectUrl);
  }

  // Verificar parámetros requeridos
  if (!code || !state) {
    console.error('[Twitter Callback Route] Missing required parameters (code or state).');
    finalRedirectUrl.searchParams.set('error', 'invalid_request');
    finalRedirectUrl.searchParams.set('details', 'Missing code or state from Twitter callback.');
    return NextResponse.redirect(finalRedirectUrl);
  }

  try {
    // Obtener datos de las cookies
    const storedState = request.cookies.get('twitter_state')?.value;
    const codeVerifier = request.cookies.get('twitter_code_verifier')?.value;
    
    console.log('[Twitter Callback Route] Retrieved from cookies:', {
        storedState: storedState,
        codeVerifier: codeVerifier ? '*** (found)' : 'null'
    });

    // Verificar state para prevenir CSRF
    if (!storedState || storedState !== state) {
      console.error('[Twitter Callback Route] State mismatch. Potential CSRF attack.');
      finalRedirectUrl.searchParams.set('error', 'invalid_request');
      finalRedirectUrl.searchParams.set('details', 'State mismatch. Please try connecting again.');
      return NextResponse.redirect(finalRedirectUrl);
    }

    if (!codeVerifier) {
      console.error('[Twitter Callback Route] Missing code verifier cookie.');
      finalRedirectUrl.searchParams.set('error', 'invalid_request');
      finalRedirectUrl.searchParams.set('details', 'Code verifier is missing. Please try connecting again.');
      return NextResponse.redirect(finalRedirectUrl);
    }

    // Intercambiar código por tokens
    const tokenResult = await exchangeCodeForTokens(code, codeVerifier);

    // Guardar tokens en cookies
    saveTwitterTokensToCookies(tokenResult);

    // Limpiar cookies temporales y redirigir
    console.log('[Twitter Callback Route] Successfully exchanged tokens. Redirecting to publisher with success message.');
    finalRedirectUrl.searchParams.set('success', 'twitter_connected');
    const response = NextResponse.redirect(finalRedirectUrl);
    
    response.cookies.delete('twitter_state');
    response.cookies.delete('twitter_code_verifier');

    return response;
  } catch (error) {
    console.error('[Twitter Callback Route] FATAL: Error exchanging code for tokens:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during callback.';
    finalRedirectUrl.searchParams.set('error', 'callback_failed');
    finalRedirectUrl.searchParams.set('details', errorMessage);
    return NextResponse.redirect(finalRedirectUrl);
  }
}
// src/app/api/twitter/publish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedTwitterClient } from '@/lib/twitter';

export async function POST(request: NextRequest) {
  try {
    const { tweets } = await request.json();

    if (!tweets || !Array.isArray(tweets) || tweets.length === 0 || !tweets[0].trim()) {
      return NextResponse.json(
        { error: 'Tweet content cannot be empty.' },
        { status: 400 }
      );
    }

    const { client } = await getAuthenticatedTwitterClient();
    
    let result;
    const cleanedTweets = tweets.map((t) =>
      t.replace(/^\d+\/\s*/, '').trim()
    );

    if (cleanedTweets.length > 1) {
      result = await client.v2.tweetThread(cleanedTweets);
    } else {
      const content = cleanedTweets[0];
      if (content.length > 280) {
        return NextResponse.json(
            { error: 'Tweet content exceeds 280 characters limit.' },
            { status: 400 }
        );
      }
      result = await client.v2.tweet(content);
    }
    
    const tweetId = Array.isArray(result) ? result[0].data.id : result.data.id;
    const { data: user } = await client.v2.me();

    return NextResponse.json({ success: true, tweetId, username: user.username });

  } catch (error: any) {
    console.error('Error publishing to Twitter:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to publish tweet.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
// src/lib/twitter.ts
import { cookies } from 'next/headers';

interface TwitterTokens {
  accessToken: string;
  refreshToken?: string;
}

// Función helper para crear una instancia de TwitterApi
async function createTwitterClient(config: { clientId: string; clientSecret: string } | string) {
  const { TwitterApi } = await import('twitter-api-v2');
  return new TwitterApi(config);
}

// Función para generar el enlace de autorización
export async function generateAuthLink() {
  console.log('[Twitter Lib] generateAuthLink: Generating authorization link...');
  
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (!clientId || !clientSecret || !baseUrl) {
    console.error('[Twitter Lib] generateAuthLink: Missing required environment variables.');
    throw new Error('Missing required environment variables for Twitter auth.');
  }

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
}

// Función para obtener información del usuario
export async function getTwitterUser(accessToken: string) {
  console.log('[Twitter Lib] getTwitterUser: Fetching user data...');
  
  const client = await createTwitterClient(accessToken);
  const user = await client.v2.me({ 'user.fields': ['profile_image_url'] });
  
  console.log(`[Twitter Lib] getTwitterUser: Successfully fetched user: ${user.data.username}`);
  return user;
}

// Función para refrescar tokens
export async function refreshTwitterTokens(refreshToken: string) {
  console.log('[Twitter Lib] refreshTwitterTokens: Attempting to refresh tokens...');
  
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing required environment variables for Twitter auth.');
  }

  const client = await createTwitterClient({ clientId, clientSecret });
  const { accessToken, refreshToken: newRefreshToken } = await client.refreshOAuth2Token(refreshToken);
  
  console.log('[Twitter Lib] refreshTwitterTokens: Successfully refreshed tokens.');
  return { accessToken, refreshToken: newRefreshToken };
}

// Función para obtener cliente autenticado (LA QUE FALTABA)
export async function getAuthenticatedTwitterClient() {
  console.log('[Twitter Lib] getAuthenticatedTwitterClient: Getting authenticated client...');
  
  const tokens = getTwitterTokensFromCookies();
  if (!tokens?.accessToken) {
    throw new Error('No Twitter access token found. Please connect your Twitter account first.');
  }

  const client = await createTwitterClient(tokens.accessToken);
  return { client, tokens };
}

// Función para publicar un tweet
export async function publishTweet(text: string, accessToken: string) {
  console.log(`[Twitter Lib] publishTweet: Attempting to publish tweet with length ${text.length}`);
  
  const client = await createTwitterClient(accessToken);
  const result = await client.v2.tweet(text);
  
  console.log('[Twitter Lib] publishTweet: Successfully published tweet.');
  return result;
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
// src/app/actions/twitter-actions.ts
'use server';

import {
  getTwitterTokensFromCookies,
  getTwitterUser,
  clearTwitterTokens,
  refreshTwitterTokens,
  saveTwitterTokensToCookies
} from '@/lib/twitter';
import { revalidatePath } from 'next/cache';

// Verificar si el usuario está conectado a Twitter
export async function checkTwitterConnection() {
  console.log('[Twitter Action] checkTwitterConnection: Starting connection check.');
  const tokens = getTwitterTokensFromCookies();
  
  if (!tokens?.accessToken) {
    console.log('[Twitter Action] checkTwitterConnection: No access token found. User is not connected.');
    return { isConnected: false, user: null };
  }

  try {
    console.log('[Twitter Action] checkTwitterConnection: Access token found. Verifying with Twitter API...');
    const user = await getTwitterUser(tokens.accessToken);
    console.log(`[Twitter Action] checkTwitterConnection: Verification successful for user @${user.data.username}.`);
    return { 
      isConnected: true, 
      user: {
        id: user.data.id,
        username: user.data.username,
        name: user.data.name,
        profile_image_url: user.data.profile_image_url,
      }
    };
  } catch (error: any) {
    console.error(`[Twitter Action] checkTwitterConnection: Error verifying user. Code: ${error.code}, Message: ${error.message}`);
    
    // Si el token expiró (código 401) y tenemos un refresh token, intentamos refrescarlo.
    if (error.code === 401 && tokens.refreshToken) {
      console.log('[Twitter Action] checkTwitterConnection: Access token seems to be expired. Attempting to refresh...');
      try {
        const newTokens = await refreshTwitterTokens(tokens.refreshToken);
        saveTwitterTokensToCookies(newTokens);
        console.log('[Twitter Action] checkTwitterConnection: Tokens refreshed successfully. Retrying user verification...');
        
        // Reintentar la verificación con el nuevo token
        const user = await getTwitterUser(newTokens.accessToken);
        console.log(`[Twitter Action] checkTwitterConnection: Verification successful after refresh for @${user.data.username}.`);
        return {
          isConnected: true,
          user: {
            id: user.data.id,
            username: user.data.username,
            name: user.data.name,
            profile_image_url: user.data.profile_image_url,
          }
        };
      } catch (refreshError: any) {
        console.error('[Twitter Action] checkTwitterConnection: Failed to refresh token. Clearing tokens.', refreshError);
        clearTwitterTokens();
        return { isConnected: false, user: null, error: 'Your Twitter session has expired. Please reconnect.' };
      }
    }
    
    // Para otros errores o si no hay refresh token, simplemente marcamos como desconectado.
    clearTwitterTokens();
    const errorMessage = error.message || 'Failed to verify connection. Please try reconnecting.';
    return { isConnected: false, user: null, error: errorMessage };
  }
}

// Desconectar de Twitter
export async function disconnectTwitter() {
  console.log('[Twitter Action] disconnectTwitter: Disconnecting user...');
  clearTwitterTokens();
  revalidatePath('/dashboard/publisher');
  console.log('[Twitter Action] disconnectTwitter: User disconnected and path revalidated.');
  return { success: true };
}
// src/components/dashboard/TwitterIntegration.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Twitter, CheckCircle, AlertCircle, Loader2, Power } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { checkTwitterConnection, disconnectTwitter } from '@/app/actions/twitter-actions';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface TwitterUser {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
}

interface ConnectionStatus {
  isConnected: boolean;
  user?: TwitterUser | null;
  error?: string;
}

export default function TwitterIntegration({ dict }: { dict: any }) {
  const [status, setStatus] = useState<ConnectionStatus>({ isConnected: false, user: null });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const checkConnection = useCallback(async () => {
    setLoading(true);
    try {
      const result = await checkTwitterConnection();
      setStatus(result);
      if (result.error && !result.isConnected) {
        toast({
            variant: "destructive",
            title: dict.connectionError,
            description: result.error,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : dict.unknownError;
      setStatus({ isConnected: false, error: errorMessage });
      toast({
          variant: "destructive",
          title: dict.connectionError,
          description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [toast, dict]);

  useEffect(() => {
    const success = searchParams.get('twitter_success');
    const error = searchParams.get('twitter_error');

    if (success) {
      toast({
        title: success === 'connected' ? dict.connectSuccess : dict.disconnectSuccess,
      });
      checkConnection();
      router.replace(pathname);
    } else if (error) {
      toast({
        variant: 'destructive',
        title: dict.connectFail,
        description: `Error: ${error}. Please try connecting again.`,
      });
      router.replace(pathname);
    }
    
    checkConnection();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleConnect = () => {
    setLoading(true);
    window.location.href = '/api/twitter/auth';
  };

  const handleDisconnect = async () => {
    setLoading(true);
    await disconnectTwitter();
    // Re-check connection after server action is done
    await checkConnection();
    toast({ title: dict.disconnectSuccess });
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Twitter className="h-5 w-5 text-primary" />
          {dict.title}
        </CardTitle>
        <CardDescription>
          {dict.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">{dict.checkingStatus}</span>
            </div>
        ) : status?.isConnected && status.user ? (
          <div className="space-y-3">
             <Alert variant="default" className="border-green-500/50 bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-foreground">
                    <div className="flex items-center gap-2">
                        {status.user.profile_image_url && (
                            <Image src={status.user.profile_image_url} alt={status.user.name} width={24} height={24} className="rounded-full" />
                        )}
                        <span>{dict.connectedAs.replace('{user}', status.user.username)}</span>
                    </div>
                </AlertDescription>
             </Alert>
            <Button 
                onClick={handleDisconnect} 
                variant="destructive"
                className="w-full"
                disabled={loading}
              >
                <Power className="mr-2 h-4 w-4" />
                {dict.disconnect}
              </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {status?.error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{status.error}</AlertDescription>
                </Alert>
            )}
            <Button onClick={handleConnect} disabled={loading} className="w-full">
                <Twitter className="mr-2 h-4 w-4" />
                {dict.connect}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

package.json(twitter version)
"twitter-api-v2": "^1.17.1",
.env
TWITTER_CLIENT_ID=SHhVSDdRdmtTTTJ1dHZRY203Y2M6MTpjaQ
TWITTER_CLIENT_SECRET=OLs0eLxNK4Yb0BgGzbzgJwOl5NEBLl0pdcpcdgnzAqzXE5R0e_
NEXT_PUBLIC_BASE_URL=https://9000-firebase-studio-1751265422046.cluster-qhrn7lb3szcfcud6uanedbkjnm.cloudworkstations.dev
GOOGLE_API_KEY=AIzaSyAhLDDqqp6oadMru3oFBS-3iU7iwG6FDYE


# ESTO ARREGLO EL PROBLEMA DE AUTENTICACION:
// src/lib/twitter.ts
import { cookies } from 'next/headers';
import { TwitterApi } from 'twitter-api-v2';

interface TwitterTokens {
  accessToken: string;
  refreshToken?: string;
}

// Función helper para crear una instancia de TwitterApi
function createTwitterClient(config: { clientId: string; clientSecret: string } | string) {
  return new TwitterApi(config);
}

// Función para generar el enlace de autorización
export async function generateAuthLink() {
  console.log('[Twitter Lib] generateAuthLink: Generating authorization link...');
  
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (!clientId || !clientSecret || !baseUrl) {
    console.error('[Twitter Lib] generateAuthLink: Missing required environment variables.');
    throw new Error('Missing required environment variables for Twitter auth.');
  }

  const client = createTwitterClient({ clientId, clientSecret });
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
  console.log('[Twitter Lib] exchangeCodeForTokens: Starting token exchange...');
  
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (!clientId || !clientSecret || !baseUrl) {
    throw new Error('Missing required environment variables for Twitter auth.');
  }
  
  const client = createTwitterClient({ clientId, clientSecret });
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
}

// Función para obtener información del usuario
export async function getTwitterUser(accessToken: string) {
  console.log('[Twitter Lib] getTwitterUser: Fetching user data...');
  
  const client = createTwitterClient(accessToken);
  const user = await client.v2.me({ 'user.fields': ['profile_image_url'] });
  
  console.log(`[Twitter Lib] getTwitterUser: Successfully fetched user: ${user.data.username}`);
  return user;
}

// Función para refrescar tokens
export async function refreshTwitterTokens(refreshToken: string) {
  console.log('[Twitter Lib] refreshTwitterTokens: Attempting to refresh tokens...');
  
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing required environment variables for Twitter auth.');
  }

  const client = createTwitterClient({ clientId, clientSecret });
  const { accessToken, refreshToken: newRefreshToken } = await client.refreshOAuth2Token(refreshToken);
  
  console.log('[Twitter Lib] refreshTwitterTokens: Successfully refreshed tokens.');
  return { accessToken, refreshToken: newRefreshToken };
}

// Función para obtener cliente autenticado
export async function getAuthenticatedTwitterClient() {
  console.log('[Twitter Lib] getAuthenticatedTwitterClient: Getting authenticated client...');
  
  const tokens = getTwitterTokensFromCookies();
  if (!tokens?.accessToken) {
    throw new Error('No Twitter access token found. Please connect your Twitter account first.');
  }

  const client = createTwitterClient(tokens.accessToken);
  return { client, tokens };
}

// Función para publicar un tweet
export async function publishTweet(text: string, accessToken: string) {
  console.log(`[Twitter Lib] publishTweet: Attempting to publish tweet with length ${text.length}`);
  
  const client = createTwitterClient(accessToken);
  const result = await client.v2.tweet(text);
  
  console.log('[Twitter Lib] publishTweet: Successfully published tweet.');
  return result;
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
The main issue was with the dynamic import of twitter-api-v2. I've changed it to use a regular import statement instead of the async dynamic import. Here are the key changes:

Fixed the import: Changed from const { TwitterApi } = await import('twitter-api-v2'); to import { TwitterApi } from 'twitter-api-v2';
Removed async from helper function: The createTwitterClient function no longer needs to be async since we're not using dynamic imports.
Updated all function calls: Removed the await keywords when calling createTwitterClient since it's no longer async.

If you still encounter issues, there might be a few other things to check:
1. Verify your environment variables are correct:
Make sure your .env file is properly loaded. You can add a console log at the beginning of the generateAuthLink function to verify:
typescriptconsole.log('Environment check:', {
  clientId: !!process.env.TWITTER_CLIENT_ID,
  clientSecret: !!process.env.TWITTER_CLIENT_SECRET,
  baseUrl: !!process.env.NEXT_PUBLIC_BASE_URL
});
2. Check your Twitter App configuration:

Make sure your Twitter app has the correct permissions (Read and Write)
Verify your callback URL is correctly set in the Twitter Developer Portal: https://your-domain.com/api/twitter/callback

3. Alternative approach with dynamic import (if still needed):
If you still need to use dynamic imports for some reason, here's how to do it properly:
// src/lib/twitter.ts - Alternative with dynamic import
import { cookies } from 'next/headers';

interface TwitterTokens {
  accessToken: string;
  refreshToken?: string;
}

// Función helper para crear una instancia de TwitterApi
async function createTwitterClient(config: { clientId: string; clientSecret: string } | string) {
  const { TwitterApi } = await import('twitter-api-v2');
  return new TwitterApi(config);
}

// Función para generar el enlace de autorización
export async function generateAuthLink() {
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
}

// Función para obtener información del usuario
export async function getTwitterUser(accessToken: string) {
  console.log('[Twitter Lib] getTwitterUser: Fetching user data...');
  
  const client = await createTwitterClient(accessToken);
  const user = await client.v2.me({ 'user.fields': ['profile_image_url'] });
  
  console.log(`[Twitter Lib] getTwitterUser: Successfully fetched user: ${user.data.username}`);
  return user;
}

// Función para refrescar tokens
export async function refreshTwitterTokens(refreshToken: string) {
  console.log('[Twitter Lib] refreshTwitterTokens: Attempting to refresh tokens...');
  
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing required environment variables for Twitter auth.');
  }

  const client = await createTwitterClient({ clientId, clientSecret });
  const { accessToken, refreshToken: newRefreshToken } = await client.refreshOAuth2Token(refreshToken);
  
  console.log('[Twitter Lib] refreshTwitterTokens: Successfully refreshed tokens.');
  return { accessToken, refreshToken: newRefreshToken };
}

// Función para obtener cliente autenticado
export async function getAuthenticatedTwitterClient() {
  console.log('[Twitter Lib] getAuthenticatedTwitterClient: Getting authenticated client...');
  
  const tokens = getTwitterTokensFromCookies();
  if (!tokens?.accessToken) {
    throw new Error('No Twitter access token found. Please connect your Twitter account first.');
  }

  const client = await createTwitterClient(tokens.accessToken);
  return { client, tokens };
}

// Función para publicar un tweet
export async function publishTweet(text: string, accessToken: string) {
  console.log(`[Twitter Lib] publishTweet: Attempting to publish tweet with length ${text.length}`);
  
  const client = await createTwitterClient(accessToken);
  const result = await client.v2.tweet(text);
  
  console.log('[Twitter Lib] publishTweet: Successfully published tweet.');
  return result;
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
// next.config.ts
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;

To fix the issue:

Use the first artifact (the one with regular imports) - this should resolve the initialization error.
Check your Next.js version compatibility - if you're using Next.js 13+ with App Router, make sure you have the correct version of twitter-api-v2.
Verify package installation:
bashnpm uninstall twitter-api-v2
npm install twitter-api-v2@1.17.1

Restart your development server after making these changes.

The root cause of your error was the async dynamic import pattern causing a race condition with the TwitterApi class initialization. The direct import approach should resolve this issue.
# SIN EMBARGO LUEGO DE HABERME AUTENTICADO CORRECTAEMNTE AHORA ME DA ESTE ERROR LUEGO HABERSE REINICIADO LA APLICACION
GET https://9000-firebase-studio-1751265422046.cluster-qhrn7lb3szcfcud6uanedbkjnm.cloudworkstations.dev/en/dashboard 500 (Internal Server Error)Understand this error
react-dom.development.js:29895 Download the React DevTools for a better development experience: https://reactjs.org/link/react-devtools
node-stack-frames.ts:40 Uncaught ReferenceError: Cannot access 'TwitterApiReadWrite' before initialization
    at Module.default (file:///home/user/studio/.next/server/chunks/ssr/node_modules_twitter-api-v2_dist_esm_b256f8cf._.js:7127:21) bla bla bla
getServerError @ node-stack-frames.ts:40
(anonymous) @ index.tsx:945
setTimeout
hydrate @ index.tsx:923
await in hydrate
pageBootstrap @ page-bootstrap.ts:23
(anonymous) @ next-dev-turbopack.ts:49
Promise.then
[project]/node_modules/next/dist/client/next-dev-turbopack.js [client] (ecmascript) @ next-dev-turbopack.ts:28
(anonymous) @ dev-base.ts:201
runModuleExecutionHooks @ dev-base.ts:261
instantiateModule @ dev-base.ts:199
getOrInstantiateRuntimeModule @ dev-base.ts:97
registerChunk @ runtime-backend-dom.ts:85
await in registerChunk
registerChunk @ runtime-base.ts:356
(anonymous) @ dev-backend-dom.ts:127
(anonymous) @ dev-backend-dom.ts:127Understand this error
websocket.ts:32 [HMR] connected
report-hmr-latency.ts:26 [Fast Refresh] done in NaNms
websocket.ts:32 [HMR] connected
report-hmr-latency.ts:26 [Fast Refresh] done in 61233ms
Runtime Error


ReferenceError: Cannot access 'TwitterApiReadWrite' before initialization

src/lib/twitter.ts (3:1) @ [project]/src/lib/twitter.ts [app-rsc] (ecmascript)


  1 | // src/lib/twitter.ts
  2 | import { cookies } from 'next/headers';
> 3 | import { TwitterApi } from 'twitter-api-v2';
    | ^
  4 |
  5 | interface TwitterTokens {
  6 |   accessToken: string;
Call Stack
50

Show 45 ignore-listed frame(s)
[project]/src/lib/twitter.ts [app-rsc] (ecmascript)
src/lib/twitter.ts (3:1)
[project]/src/app/actions/twitter-actions.ts [app-rsc] (ecmascript)
src/app/actions/twitter-actions.ts (4:1)
[project]/.next-internal/server/app/[lang]/dashboard/page/actions.js { ACTIONS_MODULE0 => "[project]/src/ai/flows/generate-conspiracy-themes.ts [app-rsc] (ecmascript)", ACTIONS_MODULE1 => "[project]/src/app/actions/twitter-actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <module evaluation>
file:///home/user/studio/.next/server/chunks/ssr/[root-of-the-server]__f43b87cf._.js (639:169)
[project]/.next-internal/server/app/[lang]/dashboard/page/actions.js { ACTIONS_MODULE0 => "[project]/src/ai/flows/generate-conspiracy-themes.ts [app-rsc] (ecmascript)", ACTIONS_MODULE1 => "[project]/src/app/actions/twitter-actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript)
file:///home/user/studio/.next/server/chunks/ssr/[root-of-the-server]__f43b87cf._.js (666:561)
Object.<anonymous>
.next/server/app/[lang]/dashboard/page.js (32:9)


# SOLUCION
// src/lib/twitter.ts
import { cookies } from 'next/headers';

interface TwitterTokens {
  accessToken: string;
  refreshToken?: string;
}

// Cache for TwitterApi class to avoid repeated dynamic imports
let TwitterApiClass: any = null;

// Function to get TwitterApi class with caching
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

The key changes I made to fix the circular dependency issue are:

Dynamic Import with Caching: I created a getTwitterApiClass() function that dynamically imports the TwitterApi class only when needed and caches it to avoid repeated imports.
Async createTwitterClient: Made the helper function async and used the cached dynamic import.
Better Error Handling: Added try-catch blocks around all functions to handle potential errors gracefully.
Removed Direct Import: Removed the direct import of TwitterApi from the top of the file, which was causing the circular dependency.

Additional steps to ensure this works:

Clear Next.js cache (very important):
bashrm -rf .next
npm run dev

Alternative: Use a different version of twitter-api-v2 if the issue persists:
bashnpm uninstall twitter-api-v2
npm install twitter-api-v2@1.15.0

If you're still having issues, you can also try adding this to your next.config.js:
javascript/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['twitter-api-v2'],
  },
}

module.exports = nextConfig


The main issue was that twitter-api-v2 has internal circular dependencies that cause problems when imported directly in Next.js 13+ App Router. The dynamic import approach with caching solves this by loading the library only when needed and avoiding the initialization race condition.
After implementing these changes, restart your development server and the Twitter integration should work properly without the initialization error.

me da un internal server error despues de esto:
studio-8971307221:~/studio{master}$ rm -rf .next
studio-8971307221:~/studio{master}$ npm run dev
> nextn@0.1.0 dev
> next dev --turbopack -p 9002
 ⨯ Failed to start server
Error: listen EADDRINUSE: address already in use :::9002
    at  (Error: listen EADDRINUSE: address already in use :::9002)
    at new Promise () {
  code: 'EADDRINUSE',
  errno: -98,
  syscall: 'listen',
  address: '::',
  port: 9002
}
studio-8971307221:~/studio{master}$

nuestra url es https://9000-firebase-studio-1751265422046.cluster-qhrn7lb3szcfcud6uanedbkjnm.cloudworkstations.dev/
La version que si andaba de twitter: npm install twitter-api-v2@1.17.1