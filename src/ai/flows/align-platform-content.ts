// src/ai/flows/align-platform-content.ts
'use server';

/**
 * @fileOverview Provides AI-driven content suggestions tailored to different platforms.
 *
 * - alignPlatformContent - A function that generates platform-specific content suggestions.
 * - AlignPlatformContentInput - The input type for the alignPlatformContent function.
 * - AlignPlatformContentOutput - The return type for the alignPlatformContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AlignPlatformContentInputSchema = z.object({
  theme: z.string().describe('The overall theme or topic for the content.'),
  bookTitle: z.string().describe('The title of the book being promoted.'),
  platform: z
    .enum(['Twitter', 'Instagram', 'TikTok'])
    .describe('The platform for which content is being generated.'),
  targetAudience: z.string().describe('Description of the target audience for the content.'),
});
export type AlignPlatformContentInput = z.infer<
  typeof AlignPlatformContentInputSchema
>;

const AlignPlatformContentOutputSchema = z.object({
  contentSuggestion: z
    .string()
    .describe('AI-generated content suggestion tailored to the specified platform.'),
  reasoning: z.string().describe('Explanation of why the content suggestion is appropriate for the platform and target audience.'),
});
export type AlignPlatformContentOutput = z.infer<
  typeof AlignPlatformContentOutputSchema
>;

export async function alignPlatformContent(
  input: AlignPlatformContentInput
): Promise<AlignPlatformContentOutput> {
  return alignPlatformContentFlow(input);
}

const alignPlatformContentPrompt = ai.definePrompt({
  name: 'alignPlatformContentPrompt',
  input: {schema: AlignPlatformContentInputSchema},
  output: {schema: AlignPlatformContentOutputSchema},
  prompt: `You are an expert social media manager specializing in book promotion.

  Based on the provided theme, book title, platform, and target audience, generate a content suggestion that is optimized for the specific platform and designed to promote the book.

  Theme: {{{theme}}}
  Book Title: {{{bookTitle}}}
  Platform: {{{platform}}}
  Target Audience: {{{targetAudience}}}

  Provide a content suggestion and a brief explanation of why the suggestion is appropriate for the platform and target audience. Ensure that all content suggestions include a link to purchase the book at ignobilesveritates.com.

  Content Suggestion:
  Reasoning:`,
});

const alignPlatformContentFlow = ai.defineFlow(
  {
    name: 'alignPlatformContentFlow',
    inputSchema: AlignPlatformContentInputSchema,
    outputSchema: AlignPlatformContentOutputSchema,
  },
  async (input) => {
    let retries = 3;
    let lastError: any;
    for (let i = 0; i < retries; i++) {
      try {
        const { output } = await alignPlatformContentPrompt(input);
        return output!;
      } catch (e) {
        lastError = e;
        if (e instanceof Error && e.message.includes('503')) {
          console.log(`Model overloaded, retrying in ${i + 1}s...`);
          await new Promise(res => setTimeout(res, 1000 * (i + 1)));
          continue;
        }
        throw e;
      }
    }
    throw new Error('The AI model is currently overloaded. Please try again later.', { cause: lastError });
  }
);
