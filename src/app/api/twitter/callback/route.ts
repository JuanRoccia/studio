// src/app/api/twitter/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { loginWithPKCE } from '@/lib/twitter';

export async function GET(req: NextRequest) {
  const lang = req.cookies.get('NEXT_LOCALE')?.value || 'en';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  
  if (!baseUrl) {
    return new NextResponse('Base URL is not configured.', { status: 500 });
  }

  // Redirect to the publisher page, which is better suited for handling this.
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
    
    const storedState = cookies().get('twitter_state')?.value;
    const storedCodeVerifier = cookies().get('twitter_code_verifier')?.value;

    if (!state || !code || !storedState || !storedCodeVerifier || state !== storedState) {
      redirectUrl.searchParams.set('error', 'invalid_request');
      redirectUrl.searchParams.set('details', 'State mismatch or missing parameters. Please try connecting again.');
      return NextResponse.redirect(redirectUrl);
    }

    const { accessToken, refreshToken } = await loginWithPKCE(code, storedCodeVerifier);
    
    const permanentCookieOptions = {
        httpOnly: true,
        secure: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 90, // 90 days
        sameSite: 'lax' as const,
    };
    
    cookies().set('twitter_access_token', accessToken, permanentCookieOptions);
    if (refreshToken) {
      cookies().set('twitter_refresh_token', refreshToken, permanentCookieOptions);
    }

    // Clean up temporary cookies
    cookies().delete('twitter_state');
    cookies().delete('twitter_code_verifier');
    
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
