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
