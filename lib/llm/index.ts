export interface LLMOptions {
  maxTokens?: number;
  /** Override the default model for this specific call */
  model?: string;
}

export interface LLMProvider {
  generate(systemPrompt: string, userPrompt: string, options?: LLMOptions): Promise<string>;
}

export function getLLM(): LLMProvider {
  const provider = process.env.LLM_PROVIDER ?? 'groq';
  if (provider === 'claude') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ClaudeProvider } = require('./claude');
    return new ClaudeProvider();
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GroqProvider } = require('./groq');
  return new GroqProvider();
}
