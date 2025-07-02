'use server';

/**
 * @fileOverview Generates engagement strategies using philosophical approaches.
 *
 * - generateEngagementStrategy - A function that returns a persuasive text.
 * - GenerateEngagementStrategyInput - The input type for the function.
 * - GenerateEngagementStrategyOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateEngagementStrategyInputSchema = z.object({
  taskType: z
    .enum(['Comment', 'Direct Message'])
    .describe('The type of engagement task.'),
  topic: z.string().describe('The topic of the post or user to engage with.'),
  style: z
    .enum(['Nietzschean', 'Socratic', 'Stoic'])
    .describe('The philosophical style for the engagement.'),
  language: z.enum(['en', 'es-AR']).default('en').describe("The language for the generated content. 'es-AR' is Argentinian Spanish."),
});
export type GenerateEngagementStrategyInput = z.infer<
  typeof GenerateEngagementStrategyInputSchema
>;

const GenerateEngagementStrategyOutputSchema = z.object({
  strategy: z
    .string()
    .describe(
      'A brief explanation of the psychological strategy behind the text.'
    ),
  suggestedText: z
    .string()
    .describe('The generated text for the engagement task.'),
});
export type GenerateEngagementStrategyOutput = z.infer<
  typeof GenerateEngagementStrategyOutputSchema
>;

export async function generateEngagementStrategy(
  input: GenerateEngagementStrategyInput
): Promise<GenerateEngagementStrategyOutput> {
  return generateEngagementStrategyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateEngagementStrategyPrompt',
  input: {schema: GenerateEngagementStrategyInputSchema},
  output: {schema: GenerateEngagementStrategyOutputSchema},
  prompt: `You are an expert in philosophy and psychological persuasion, specializing in digital communication. Your response MUST be in the language specified by the 'language' code: {{{language}}}.

Your task is to generate an authentic-sounding engagement text based on the provided parameters. The goal is to pique curiosity and subtly guide users towards the ideas in the book "Ignobiles Veritates" and encourage them to visit ignobilesveritates.com, without it sounding like a direct advertisement.

Parameters:
- Engagement Type: {{{taskType}}}
- Topic/Context: {{{topic}}}
- Philosophical Style: {{{style}}}

Instructions:
1.  **Adopt the Persona:** Embody the chosen philosophical style.
    - **Nietzschean:** Question established "truths," challenge the user's perspective, focus on power dynamics and the "will to power" behind information. Be provocative but profound.
    - **Socratic:** Ask probing questions to guide the user to their own conclusions. Feign ignorance to encourage deeper thought. Use irony.
    - **Stoic:** Offer a calm, reasoned perspective. Focus on logic, virtue, and distinguishing between what we can and cannot control in the flow of information.
2.  **Craft the Text:** Write a short, engaging text for the specified 'Engagement Type'.
3.  **Explain the Strategy:** Briefly describe the psychological tactic you used.

Example Output (for a Nietzschean comment):
- Strategy: "Challenge the conventional narrative by questioning the 'slave morality' of accepting information at face value, encouraging a re-evaluation of 'truth' from a position of strength."
- Suggested Text: "An interesting take, but what if the 'facts' as presented are merely a comfortable narrative for the herd? True knowledge is often found not in answers, but in the courage to question the questions themselves. The abyss of what we don't know is where real power lies. ignobilesveritates.com"
`,
});

const generateEngagementStrategyFlow = ai.defineFlow(
  {
    name: 'generateEngagementStrategyFlow',
    inputSchema: GenerateEngagementStrategyInputSchema,
    outputSchema: GenerateEngagementStrategyOutputSchema,
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
