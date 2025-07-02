// src/app/api/twitter/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTwitterClient } from '@/lib/twitter';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const { client, authUrl, codeVerifier, state } = await getTwitterClient();
  
  // Store codeVerifier and state in cookies to verify them in the callback
  cookies().set('twitter_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 15, // 15 minutes
  });
  cookies().set('twitter_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 15, // 15 minutes
  });

  return NextResponse.redirect(authUrl);
}
