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
    console.error('[Twitter Action] checkTwitterConnection: Error verifying user.', error);
    
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
