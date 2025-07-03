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
    const { accessToken, refreshToken } = await exchangeCodeForTokens(code, codeVerifier);

    // Guardar tokens en cookies
    saveTwitterTokensToCookies({ accessToken, refreshToken });

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
