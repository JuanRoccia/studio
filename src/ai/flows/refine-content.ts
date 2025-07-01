'use server';

/**
 * @fileOverview Refines a piece of content based on a user's specific request.
 *
 * - refineContent - A function that takes text and a request, and returns refined text.
 * - RefineContentInput - The input type for the refineContent function.
 * - RefineContentOutput - The return type for the refineContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RefineContentInputSchema = z.object({
  content: z.string().describe('The content to be refined.'),
  request: z.string().describe('The user\'s request for refinement (e.g., "make it more mysterious", "check for grammar errors").'),
  language: z.enum(['en', 'es-AR']).default('en').describe("The language for the generated content. 'es-AR' is Argentinian Spanish."),
});
export type RefineContentInput = z.infer<typeof RefineContentInputSchema>;

const RefineContentOutputSchema = z.object({
  refinedContent: z.string().describe('The refined content based on the user request.'),
});
export type RefineContentOutput = z.infer<typeof RefineContentOutputSchema>;

export async function refineContent(
  input: RefineContentInput
): Promise<RefineContentOutput> {
  return refineContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'refineContentPrompt',
  input: {schema: RefineContentInputSchema},
  output: {schema: RefineContentOutputSchema},
  prompt: `You are an expert content editor and writing assistant. Your response MUST be in the language specified by the 'language' code: {{{language}}}.

Your task is to refine the provided content based on the user's specific request.
Critically, you must ONLY output the refined content itself, without any introductory text, explanations, or extra formatting.

Original Content:
---
{{{content}}}
---

User's Request: "{{{request}}}"

Now, provide the refined content directly.`,
});

const refineContentFlow = ai.defineFlow(
  {
    name: 'refineContentFlow',
    inputSchema: RefineContentInputSchema,
    outputSchema: RefineContentOutputSchema,
  },
  async (input) => {
    let retries = 3;
    let lastError: any;
    for (let i = 0; i < retries; i++) {
      try {
        const { output } = await prompt(input);
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
