'use server';

/**
 * @fileOverview Generates random suggestions for conspiracy-themed topics and keywords.
 *
 * - generateSuggestions - A function that returns a list of suggestions.
 * - GenerateSuggestionsOutput - The return type for the generateSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSuggestionsOutputSchema = z.object({
  currentEvents: z
    .array(z.string())
    .describe(
      'A list of 2-3 intriguing and mysterious current event or topic suggestions.'
    ),
  keywords: z
    .array(z.string())
    .describe('A list of 2-3 relevant keyword suggestions.'),
});

export type GenerateSuggestionsOutput = z.infer<
  typeof GenerateSuggestionsOutputSchema
>;

export async function generateSuggestions(): Promise<GenerateSuggestionsOutput> {
  return generateSuggestionsFlow({});
}

const prompt = ai.definePrompt({
  name: 'generateSuggestionsPrompt',
  output: {schema: GenerateSuggestionsOutputSchema},
  prompt: `You are an AI assistant for a conspiracy theory content creator. Your task is to brainstorm some starting points.

  Generate a list of 2-3 intriguing and mysterious current event or topic suggestions that could be spun into a conspiracy.
  Also, generate a list of 2-3 relevant keywords that are popular in this niche.

  Present the output in the requested JSON format. Do not include any introductory text.`,
});

const generateSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateSuggestionsFlow',
    outputSchema: GenerateSuggestionsOutputSchema,
  },
  async () => {
    let retries = 3;
    let lastError: any;
    for (let i = 0; i < retries; i++) {
      try {
        const { output } = await prompt({});
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
