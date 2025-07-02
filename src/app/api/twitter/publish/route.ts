import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedTwitterClient } from '@/lib/twitter';

export async function POST(request: NextRequest) {
  try {
    const { tweets } = await request.json();

    if (!tweets || !Array.isArray(tweets) || tweets.length === 0 || !tweets[0].trim()) {
      return NextResponse.json(
        { error: 'Tweet content cannot be empty.' },
        { status: 400 }
      );
    }

    const { client } = await getAuthenticatedTwitterClient();
    
    let result;
    const cleanedTweets = tweets.map((t) =>
      t.replace(/^\d+\/\s*/, '').trim()
    );

    if (cleanedTweets.length > 1) {
      result = await client.v2.tweetThread(cleanedTweets);
    } else {
      const content = cleanedTweets[0];
      if (content.length > 280) {
        return NextResponse.json(
            { error: 'Tweet content exceeds 280 characters limit.' },
            { status: 400 }
        );
      }
      result = await client.v2.tweet(content);
    }
    
    const tweetId = Array.isArray(result) ? result[0].data.id : result.data.id;
    const { data: user } = await client.v2.me();

    return NextResponse.json({ success: true, tweetId, username: user.username });

  } catch (error: any) {
    console.error('Error publishing to Twitter:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to publish tweet.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
