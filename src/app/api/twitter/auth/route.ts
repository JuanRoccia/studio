// src/app/api/twitter/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTwitterClient } from '@/lib/twitter';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const { authUrl, codeVerifier, state } = await getTwitterClient();
    
    // Store codeVerifier and state in cookies to verify them in the callback
    cookies().set('twitter_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: true, // Forcing secure cookie for HTTPS dev environment
      path: '/',
      maxAge: 60 * 15, // 15 minutes
    });
    cookies().set('twitter_state', state, {
      httpOnly: true,
      secure: true, // Forcing secure cookie for HTTPS dev environment
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
