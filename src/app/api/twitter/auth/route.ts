// src/app/api/twitter/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateAuthLink } from '@/lib/twitter';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const { url, codeVerifier, state } = await generateAuthLink();
    
    // Store codeVerifier and state in cookies to verify them in the callback
    const cookieOptions = {
      httpOnly: true,
      secure: true, // Always true for cloud environments with https
      path: '/',
      maxAge: 60 * 15, // 15 minutes
      sameSite: 'lax' as const,
    };

    cookies().set('twitter_code_verifier', codeVerifier, cookieOptions);
    cookies().set('twitter_state', state, cookieOptions);

    return NextResponse.redirect(url);

  } catch (error) {
    console.error("Error in Twitter auth route:", error);
    const errorMessage = (error instanceof Error) ? error.message : 'An unknown error occurred.';
    
    // Redirect back to dashboard with an error message
    const lang = req.cookies.get('NEXT_LOCALE')?.value || 'en';
    const redirectUrl = new URL(`/${lang}/dashboard/publisher`, req.url);
    redirectUrl.searchParams.set('error', 'twitter_auth_failed');
    redirectUrl.searchParams.set('details', errorMessage);
    
    return NextResponse.redirect(redirectUrl);
  }
}
