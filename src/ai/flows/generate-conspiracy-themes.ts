// src/ai/flows/generate-conspiracy-themes.ts
'use server';

/**
 * @fileOverview Generates conspiracy theory themes based on current events and user-defined keywords.
 *
 * - generateConspiracyThemes - A function that generates conspiracy theory themes.
 * - GenerateConspiracyThemesInput - The input type for the generateConspiracyThemes function.
 * - GenerateConspiracyThemesOutput - The return type for the generateConspiracyThemes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateConspiracyThemesInputSchema = z.object({
  currentEvents: z
    .string()
    .describe('A summary of current events to inspire conspiracy themes.'),
  keywords: z
    .string()
    .describe(
      'User-defined keywords to tailor the conspiracy themes to specific interests.'
    ),
});

export type GenerateConspiracyThemesInput = z.infer<
  typeof GenerateConspiracyThemesInputSchema
>;

const GenerateConspiracyThemesOutputSchema = z.object({
  themes: z
    .array(z.string())
    .describe(
      'A list of conspiracy theory themes based on the current events and keywords.'
    ),
});

export type GenerateConspiracyThemesOutput = z.infer<
  typeof GenerateConspiracyThemesOutputSchema
>;

export async function generateConspiracyThemes(
  input: GenerateConspiracyThemesInput
): Promise<GenerateConspiracyThemesOutput> {
  return generateConspiracyThemesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateConspiracyThemesPrompt',
  input: {schema: GenerateConspiracyThemesInputSchema},
  output: {schema: GenerateConspiracyThemesOutputSchema},
  prompt: `You are a creative conspiracy theory generator. Generate a list of conspiracy theory themes based on the current events and keywords provided.

Current Events: {{{currentEvents}}}
Keywords: {{{keywords}}}

Generate a list of conspiracy theory themes that combine these elements. Each theme should be concise and engaging.`,
});

const generateConspiracyThemesFlow = ai.defineFlow(
  {
    name: 'generateConspiracyThemesFlow',
    inputSchema: GenerateConspiracyThemesInputSchema,
    outputSchema: GenerateConspiracyThemesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
