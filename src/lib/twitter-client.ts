'use server';

// This file is a workaround for a Next.js server-side module initialization issue.
// By dynamically importing the TwitterApi class, we prevent it from being initialized
// at build time, which causes a "Cannot access '...' before initialization" error.
export async function getTwitterApiClass() {
    const { TwitterApi } = await import('twitter-api-v2');
    return TwitterApi;
}
