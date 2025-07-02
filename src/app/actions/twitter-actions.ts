// src/app/actions/twitter-actions.ts
'use server';

import { cookies } from 'next/headers';
import { getAuthenticatedTwitterClient, getTokens } from '@/lib/twitter';

export async function checkTwitterConnection() {
  const tokens = await getTokens();
  return { isConnected: !!tokens.accessToken };
}

export async function disconnectTwitter() {
  cookies().delete('twitter_access_token');
  cookies().delete('twitter_refresh_token');
  return { isConnected: false };
}

function cleanTweetText(text: string): string {
  // Removes the "X/ " prefix from thread parts, e.g., "1/ This is a tweet" -> "This is a tweet"
  return text.replace(/^\d+\/\s*/, '').trim();
}

export async function publishToTwitter({ tweets }: { tweets: string[] }) {
    const tokens = await getTokens();
    if (!tokens.accessToken) {
        throw new Error('User not authenticated with Twitter.');
    }

    const { client: userClient, refreshed } = await getAuthenticatedTwitterClient(tokens.accessToken, tokens.refreshToken);

    // If tokens were refreshed, update the cookies
    if (refreshed && refreshed.accessToken && refreshed.refreshToken) {
        const oneDay = 24 * 60 * 60 * 1000;
        cookies().set('twitter_access_token', refreshed.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', expires: Date.now() + 7 * oneDay });
        cookies().set('twitter_refresh_token', refreshed.refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', expires: Date.now() + 30 * oneDay });
    }

    try {
        if (tweets.length === 0) {
            throw new Error('No content to publish.');
        }

        const cleanedTweets = tweets.map(cleanTweetText).filter(t => t.length > 0);

        if (cleanedTweets.length > 1) {
            // It's a thread
            await userClient.v2.tweetThread(cleanedTweets);
        } else {
            // It's a single tweet
            await userClient.v2.tweet(cleanedTweets[0]);
        }
        return { success: true, message: 'Content published successfully on Twitter.' };
    } catch (error: any) {
        console.error('Failed to publish to Twitter:', error);
        const errorMessage = error.data?.detail || error.message || 'An unknown error occurred.';
        return { success: false, message: `Failed to publish: ${errorMessage}` };
    }
}
