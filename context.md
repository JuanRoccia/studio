// src/app/api/twitter/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, saveTokensToCookies } from '@/lib/twitter';

export async function GET(req: NextRequest) {
  const lang = req.cookies.get('NEXT_LOCALE')?.value || 'en';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  
  if (!baseUrl) {
    return new NextResponse('Base URL is not configured.', { status: 500 });
  }

  const redirectUrl = new URL(`/${lang}/dashboard/publisher`, baseUrl);

  try {
    const { searchParams } = new URL(req.url);
    const state = searchParams.get('state');
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // Handle user denial of authorization
    if (error) {
      console.error('Twitter authorization was denied by the user:', error);
      redirectUrl.searchParams.set('error', 'twitter_auth_denied');
      redirectUrl.searchParams.set('details', `Twitter reported an error: ${error}`);
      return NextResponse.redirect(redirectUrl);
    }
    
    const storedState = req.cookies.get('twitter_state')?.value;
    const storedCodeVerifier = req.cookies.get('twitter_code_verifier')?.value;

    if (!state || !code || !storedState || !storedCodeVerifier || state !== storedState) {
      redirectUrl.searchParams.set('error', 'invalid_request');
      redirectUrl.searchParams.set('details', 'State mismatch or missing parameters. Please try connecting again.');
      return NextResponse.redirect(redirectUrl);
    }

    const { accessToken, refreshToken } = await exchangeCodeForTokens(code, storedCodeVerifier);
    
    saveTokensToCookies({ accessToken, refreshToken });

    // Clean up temporary cookies
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete('twitter_state');
    response.cookies.delete('twitter_code_verifier');
    
    // Redirect with success message
    redirectUrl.searchParams.set('success', 'twitter_connected');
    return NextResponse.redirect(redirectUrl);
  
  } catch (error) {
    console.error("Twitter callback error:", error);
    const errorMessage = (error instanceof Error) ? error.message : 'An unknown error occurred during callback.';
    redirectUrl.searchParams.set('error', 'callback_failed');
    redirectUrl.searchParams.set('details', errorMessage);
    return NextResponse.redirect(redirectUrl);
  }
}


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


// src/app/api/twitter/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateAuthLink } from '@/lib/twitter';

export async function GET(req: NextRequest) {
  const lang = req.cookies.get('NEXT_LOCALE')?.value || 'en';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) {
    return new NextResponse('Base URL is not configured.', { status: 500 });
  }
  const publisherUrl = new URL(`/${lang}/dashboard/publisher`, baseUrl);

  try {
    const { url, codeVerifier, state } = await generateAuthLink();
    
    // Store codeVerifier and state in cookies to verify them in the callback
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 15, // 15 minutes
      sameSite: 'lax' as const,
    };

    const response = NextResponse.redirect(url);
    response.cookies.set('twitter_code_verifier', codeVerifier, cookieOptions);
    response.cookies.set('twitter_state', state, cookieOptions);

    return response;

  } catch (error) {
    console.error("Error in Twitter auth route:", error);
    const errorMessage = (error instanceof Error) ? error.message : 'An unknown error occurred.';
    
    publisherUrl.searchParams.set('error', 'twitter_auth_failed');
    publisherUrl.searchParams.set('details', errorMessage);
    
    return NextResponse.redirect(publisherUrl);
  }
}


.env

TWITTER_CLIENT_ID=SHhVSDdRdmtTTTJ1dHZRY203Y2M6MTpjaQ
TWITTER_CLIENT_SECRET=OLs0eLxNK4Yb0BgGzbzgJwOl5NEBLl0pdcpcdgnzAqzXE5R0e_
NEXT_PUBLIC_BASE_URL=https://9000-firebase-studio-1751265422046.cluster-qhrn7lb3szcfcud6uanedbkjnm.cloudworkstations.dev
GOOGLE_API_KEY=AIzaSyAhLDDqqp6oadMru3oFBS-3iU7iwG6FDYE


1940217473241858048IVeritatesApp details

 Edit

Name

1940217473241858048IVeritatesApp id

31160850App permissions

Read and write

Read and Post Posts and profile informationType of App

 

(required)Web App, Automated App or Bot

Confidential clientCallback URI / Redirect URLhttps://9000-firebase-studio-1751265422046.cluster-qhrn7lb3szcfcud6uanedbkjnm.cloudworkstations.dev/api/twitter/callbackWebsite URL (required)https://9000-firebase-studio-1751265422046.cluster-qhrn7lb3szcfcud6uanedbkjnm.cloudworkstations.dev

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

// src/lib/twitter.ts
// This is a PURE server-side library. It should NOT have 'use server'.
// It is designed to be imported by API Route Handlers and Server Actions.

import { cookies } from 'next/headers';
import type { TwitterApi as TwitterApiType } from 'twitter-api-v2';

interface TwitterTokens {
  accessToken: string;
  refreshToken?: string;
}

/**
 * Dynamically imports and returns the TwitterApi class.
 * This is a crucial step to avoid Next.js bundling issues.
 */
async function getTwitterApi() {
  const { TwitterApi } = await import('twitter-api-v2');
  return TwitterApi;
}

/**
 * Generates the OAuth 2.0 Authorization URL for Twitter.
 */
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

/**
 * Exchanges the authorization code for an access token and refresh token.
 */
export async function exchangeCodeForTokens(code: string, codeVerifier: string) {
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

/**
 * Retrieves the stored access and refresh tokens from cookies.
 */
export function getTokensFromCookies(): TwitterTokens | null {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('twitter_access_token')?.value;
  const refreshToken = cookieStore.get('twitter_refresh_token')?.value;

  if (!accessToken) {
    return null;
  }

  return { accessToken, refreshToken };
}


/**
 * Deletes the Twitter authentication cookies.
 */
export function clearTokensInCookies() {
  const cookieStore = cookies();
  cookieStore.delete('twitter_access_token');
  cookieStore.delete('twitter_refresh_token');
}

/**
 * Saves Twitter tokens to httpOnly cookies.
 */
export function saveTokensToCookies(tokens: TwitterTokens) {
    const cookieStore = cookies();
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 90, // 90 days
        sameSite: 'lax' as const,
    };
    cookieStore.set('twitter_access_token', tokens.accessToken, cookieOptions);
    if (tokens.refreshToken) {
        cookieStore.set('twitter_refresh_token', tokens.refreshToken, cookieOptions);
    }
}


/**
 * Creates an authenticated Twitter API client.
 * It will automatically attempt to refresh the token if it's expired.
 */
export async function getAuthenticatedTwitterClient(): Promise<{ client: TwitterApiType }> {
    const existingTokens = getTokensFromCookies();
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
            if (error?.code === 401) await clearTokensInCookies();
            throw new Error('Your Twitter session is invalid. Please disconnect and reconnect.');
        }

        console.log('Access token expired, attempting to refresh...');
        try {
            const clientId = process.env.TWITTER_CLIENT_ID;
            const clientSecret = process.env.TWITTER_CLIENT_SECRET;
            if (!clientId || !clientSecret) throw new Error('Missing Twitter app credentials for refresh.');
            
            const appClient = new TwitterApi({ clientId, clientSecret });
            const { client: refreshedClient, accessToken: newAccessToken, refreshToken: newRefreshToken } = await appClient.refreshOAuth2Token(refreshToken);

            saveTokensToCookies({ accessToken: newAccessToken, refreshToken: newRefreshToken });
            
            console.log('Twitter token refreshed and cookies updated.');
            return { client: refreshedClient };
        } catch (refreshError: any) {
            await clearTokensInCookies();
            throw new Error('Your Twitter session has expired. Please disconnect and reconnect.');
        }
    }
}


Sigue fallando la conexion a twitter
 Server   Error: Route "/[lang]/dashboard/publisher" used `params.lang`. `params` should be awaited before using its properties. 

Erorro de:
Cannot acces TwitterApiReadWrite
Como lo puedo resolver o que otra alternativ puedo usar para conectar twiter a la aplicacion o desarrollar alguna solucion alternativa que me permita realizar los posteos como una especie redireccionamiento web como podria ser usando seleniumo o pasar directamente a la url pasando datos del perfil y rediteccionando espcificamente a la zona del posteo y dejar a mano los textos generados para el post