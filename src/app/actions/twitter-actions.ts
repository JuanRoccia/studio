// src/app/actions/twitter-actions.ts
'use server';

import { getTokens, getAuthenticatedTwitterClient, clearTokens } from '@/lib/twitter';

export async function checkTwitterConnection() {
  try {
    const tokens = await getTokens();
    if (!tokens?.accessToken) {
      return { isConnected: false };
    }

    const { client } = await getAuthenticatedTwitterClient();

    const user = await client.v2.me();
    return { 
      isConnected: true,
      user: {
        id: user.data.id,
        username: user.data.username,
        name: user.data.name,
      }
    };
  } catch (error) {
    console.error('Error checking Twitter connection status:', error);
    return { 
      isConnected: false, 
      error: error instanceof Error ? error.message : 'Failed to verify connection.' 
    };
  }
}

export async function disconnectTwitter() {
  try {
    await clearTokens();
    return { success: true };
  } catch (error) {
    console.error('Error disconnecting from Twitter:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to disconnect.' 
    };
  }
}

export async function publishToTwitter(tweets: string[]) {
  if (!tweets || tweets.length === 0 || !tweets[0].trim()) {
    return { success: false, error: 'Tweet content cannot be empty.' };
  }

  try {
    const { client } = await getAuthenticatedTwitterClient();
    
    let result;
    const cleanedTweets = tweets.map(t => t.replace(/^\d+\/\s*/, '').trim());

    if (cleanedTweets.length > 1) {
        result = await client.v2.tweetThread(cleanedTweets);
    } else {
        const content = cleanedTweets[0];
        if (content.length > 280) {
            return { success: false, error: 'Tweet content exceeds 280 characters limit.' };
        }
        result = await client.v2.tweet(content);
    }
    
    const tweetId = Array.isArray(result) ? result[0].data.id : result.data.id;
    const username = (await client.v2.me()).data.username;

    return { 
      success: true, 
      tweetId: tweetId,
      message: tweets.length > 1 ? 'Thread published successfully!' : 'Tweet published successfully!',
      tweetUrl: `https://twitter.com/${username}/status/${tweetId}`
    };
  } catch (error) {
    console.error('Error publishing to Twitter:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to publish tweet.' 
    };
  }
}

export async function getTwitterUser() {
  try {
    const { client } = await getAuthenticatedTwitterClient();

    const user = await client.v2.me({
      'user.fields': ['public_metrics', 'verified', 'profile_image_url']
    });
    
    return { 
      success: true, 
      user: {
        id: user.data.id,
        username: user.data.username,
        name: user.data.name,
        verified: user.data.verified,
        profileImageUrl: user.data.profile_image_url,
        publicMetrics: user.data.public_metrics,
      }
    };
  } catch (error) {
    console.error('Error getting Twitter user:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get user info' 
    };
  }
}
