import type { LLMProvider } from './index';

// Stub — swap in by setting LLM_PROVIDER=claude and ANTHROPIC_API_KEY
export class ClaudeProvider implements LLMProvider {
  async generate(_systemPrompt: string, _userPrompt: string): Promise<string> {
    throw new Error(
      'Claude provider is not implemented yet. ' +
      'Install @anthropic-ai/sdk and implement this class, ' +
      'or keep LLM_PROVIDER=groq.'
    );
  }
}
