'use server';

/**
 * @fileOverview Analyzes social media trends for a given topic.
 *
 * - analyzeTrends - A function that returns current trends and a summary.
 * - AnalyzeTrendsInput - The input type for the analyzeTrends function.
 * - AnalyzeTrendsOutput - The return type for the analyzeTrends function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeTrendsInputSchema = z.object({
  topic: z.string().describe('The topic or keywords to analyze for trends.'),
});
export type AnalyzeTrendsInput = z.infer<typeof AnalyzeTrendsInputSchema>;

const AnalyzeTrendsOutputSchema = z.object({
  trends: z
    .array(z.string())
    .describe('A list of 3-4 currently trending related hashtags or short phrases.'),
  summary: z.string().describe('A brief summary of why these topics are trending.'),
});
export type AnalyzeTrendsOutput = z.infer<typeof AnalyzeTrendsOutputSchema>;

export async function analyzeTrends(input: AnalyzeTrendsInput): Promise<AnalyzeTrendsOutput> {
  return analyzeTrendsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeTrendsPrompt',
  input: {schema: AnalyzeTrendsInputSchema},
  output: {schema: AnalyzeTrendsOutputSchema},
  prompt: `You are a viral content strategist and conspiracy theory expert. Your job is to analyze the digital zeitgeist related to a specific topic.

Topic: {{{topic}}}

Based on the topic, identify 3-4 currently trending hashtags or short phrases on social media platforms like Twitter and TikTok. Also provide a short, sharp summary explaining the current conversation around these trends. Frame it within the context of uncovering "hidden truths".`,
});

const analyzeTrendsFlow = ai.defineFlow(
  {
    name: 'analyzeTrendsFlow',
    inputSchema: AnalyzeTrendsInputSchema,
    outputSchema: AnalyzeTrendsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
