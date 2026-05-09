import type { LLMProvider } from './index';

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqResponse {
  choices: Array<{ message: { content: string } }>;
}

export class GroqProvider implements LLMProvider {
  private readonly apiKey: string;
  private readonly model = 'llama-3.3-70b-versatile';

  constructor() {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error('GROQ_API_KEY is not set');
    this.apiKey = key;
  }

  async generate(systemPrompt: string, userPrompt: string): Promise<string> {
    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Groq API error ${res.status}: ${text}`);
    }

    const json: GroqResponse = await res.json();
    return json.choices[0].message.content;
  }
}
