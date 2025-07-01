'use server';

/**
 * @fileOverview Expands a single content idea into a multi-part narrative thread.
 *
 * - expandToThread - A function that generates the next part of a narrative thread.
 * - ExpandToThreadInput - The input type for the expandToThread function.
 * - ExpandToThreadOutput - The return type for the expandToThread function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { narrativeStages } from '@/ai/narrative-stages';

const ExpandToThreadInputSchema = z.object({
  initialContent: z.string().describe('The starting text or theme for the thread.'),
  currentThread: z.array(z.string()).describe('The parts of the thread already generated.'),
  currentStage: z.enum(narrativeStages).describe('The current narrative stage to generate content for.'),
  language: z.enum(['en', 'es-AR']).default('en').describe("The language for the generated content. 'es-AR' is Argentinian Spanish."),
});
export type ExpandToThreadInput = z.infer<typeof ExpandToThreadInputSchema>;

const ExpandToThreadOutputSchema = z.object({
  nextTweet: z.string().describe('The newly generated part of the thread for the specified stage.'),
});
export type ExpandToThreadOutput = z.infer<typeof ExpandToThreadOutputSchema>;


export async function expandToThread(
  input: ExpandToThreadInput
): Promise<ExpandToThreadOutput> {
  return expandToThreadFlow(input);
}

const ExpandToThreadPromptInputSchema = ExpandToThreadInputSchema.extend({
  isFinalStage: z.boolean().describe('Whether this is the final stage of the narrative.')
});

const prompt = ai.definePrompt({
  name: 'expandToThreadPrompt',
  input: {schema: ExpandToThreadPromptInputSchema},
  output: {schema: ExpandToThreadOutputSchema},
  prompt: `You are an expert storyteller and social media strategist, specializing in creating viral, engaging threads with a cinematic structure. 
Your response MUST be in the language specified by the 'language' code: {{{language}}}. When the language is 'es-AR', use the provided Spanish narrative stage names as a guide. When it is 'en', translate them conceptually to guide your response (e.g., 'Planteamiento detonante' is the 'Inciting Incident').

Follow this cinematic structure strictly:
1. Intro: Hook the reader, present the core mystery.
2. Planteamiento detonante (Inciting Incident): The event that kicks off the story.
3. Tensión (Rising Action): Build suspense, introduce conflict.
4. Punto de giro (Turning Point): A major twist that changes the direction of the story.
5. Desarrollo (Development): Explore the consequences of the turning point.
6. Segundo punto de inflexión (Second Turning Point): Another twist leading to the final confrontation.
7. Crisis: The "dark night of the soul" moment, the character's lowest point.
8. Climax: The final confrontation, the peak of the action.
9. Desenlace y resolución (Falling Action & Resolution): The aftermath, what it all means, and the final conclusion.

CONTEXT
- Initial Idea: {{{initialContent}}}
- Thread So Far:
{{#each currentThread}}
- "{{this}}"
{{/each}}

INSTRUCTION
Your task is to generate the text for the **{{{currentStage}}}** stage of the story.

- Keep the text for each stage concise, like a single tweet (max 280 characters).
- Make sure it logically follows the "Thread So Far".
- Do NOT repeat previous parts of the thread.
- ONLY generate the text for the requested stage.

{{#if isFinalStage}}
- CRITICAL: For this final stage, you MUST conclude the story and seamlessly integrate a call to action to discover more by purchasing the book "The Ignoble Verities" or visiting ignobilesveritates.com.
{{/if}}

Generate the content for the "{{{currentStage}}}" stage now.
`,
});

const expandToThreadFlow = ai.defineFlow(
  {
    name: 'expandToThreadFlow',
    inputSchema: ExpandToThreadInputSchema,
    outputSchema: ExpandToThreadOutputSchema,
  },
  async (input) => {
    const isFinalStage = input.currentStage === 'Desenlace y resolución';
    const promptInput = { ...input, isFinalStage };

    let retries = 3;
    let lastError: any;
    for (let i = 0; i < retries; i++) {
      try {
        const { output } = await prompt(promptInput);
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
