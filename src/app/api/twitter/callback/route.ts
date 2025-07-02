// src/app/api/twitter/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTwitterClient } from '@/lib/twitter';
import { cookies } from 'next/headers';

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

    const { client } = await getTwitterClient();
    
    const { accessToken, refreshToken } = await client.loginWithPKCE({
      code,
      codeVerifier: storedCodeVerifier,
      redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/twitter/callback`,
    });

    const oneDay = 24 * 60 * 60 * 1000;
    
    // Store the tokens securely in httpOnly cookies
    cookies().set('twitter_access_token', accessToken, {
      httpOnly: true,
      secure: true, // Forcing secure cookie for HTTPS dev environment
      path: '/',
      expires: Date.now() + 7 * oneDay, // 7 days
    });
    if (refreshToken) {
      cookies().set('twitter_refresh_token', refreshToken, {
        httpOnly: true,
        secure: true, // Forcing secure cookie for HTTPS dev environment
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
