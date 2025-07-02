// src/app/api/twitter/disconnect/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { clearTokens } from '@/lib/twitter';

export async function POST(request: NextRequest) {
  try {
    await clearTokens();
    
    return NextResponse.json({
      success: true,
      message: 'Successfully disconnected from Twitter',
    });
  } catch (error) {
    console.error('Twitter disconnect error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to disconnect from Twitter',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}