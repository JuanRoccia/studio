// src/app/api/twitter/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTokens, getAuthenticatedTwitterClient } from '@/lib/twitter';

export async function GET(request: NextRequest) {
  try {
    const tokens = getTokens();
    
    if (!tokens) {
      return NextResponse.json({
        connected: false,
        message: 'No Twitter tokens found',
      });
    }

    // Verificar si los tokens son válidos
    try {
      const { client } = await getAuthenticatedTwitterClient(
        tokens.accessToken,
        tokens.refreshToken
      );

      const user = await client.v2.me();
      
      return NextResponse.json({
        connected: true,
        user: {
          id: user.data.id,
          username: user.data.username,
          name: user.data.name,
        },
      });
    } catch (error) {
      console.error('Twitter status check error:', error);
      
      return NextResponse.json({
        connected: false,
        message: 'Invalid or expired tokens',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } catch (error) {
    console.error('Twitter status error:', error);
    
    return NextResponse.json(
      {
        connected: false,
        error: 'Failed to check Twitter status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}