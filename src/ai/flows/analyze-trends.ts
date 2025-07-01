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
  topic: z
    .string()
    .optional()
    .describe(
      'The topic or keywords to analyze for trends. If not provided, analyze general trends in the conspiracy niche.'
    ),
});
export type AnalyzeTrendsInput = z.infer<typeof AnalyzeTrendsInputSchema>;

const AnalyzeTrendsOutputSchema = z.object({
  trends: z
    .array(z.string())
    .describe(
      'A list of 3-4 currently trending related hashtags or short phrases.'
    ),
  summary: z
    .string()
    .describe('A brief summary of why these topics are trending.'),
  suggestedTopics: z
    .array(z.string())
    .describe(
      'A list of 2-3 suggested "current event" topics based on the trends.'
    ),
  suggestedKeywords: z
    .array(z.string())
    .describe('A list of 2-3 suggested keywords based on the trends.'),
});
export type AnalyzeTrendsOutput = z.infer<typeof AnalyzeTrendsOutputSchema>;

export async function analyzeTrends(
  input?: AnalyzeTrendsInput
): Promise<AnalyzeTrendsOutput> {
  return analyzeTrendsFlow(input || {});
}

const prompt = ai.definePrompt({
  name: 'analyzeTrendsPrompt',
  input: {schema: AnalyzeTrendsInputSchema},
  output: {schema: AnalyzeTrendsOutputSchema},
  prompt: `You are a viral content strategist and conspiracy theory expert. Your job is to analyze the digital zeitgeist.
{{#if topic}}
Analyze trends related to the specific topic: {{{topic}}}
{{else}}
Analyze general trends within the niche of conspiracy theories, hidden truths, and unexplained phenomena.
{{/if}}

Based on your analysis, provide the following:
1.  Identify 3-4 currently trending hashtags or short phrases on social media (Twitter, TikTok).
2.  A short, sharp summary explaining the current conversation around these trends. Frame it within the context of "uncovering hidden truths".
3.  Suggest 2-3 "current event" or topic ideas that a content creator could use based on these trends.
4.  Suggest 2-3 keywords that are relevant to these trends.
`,
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
