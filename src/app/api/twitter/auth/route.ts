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
