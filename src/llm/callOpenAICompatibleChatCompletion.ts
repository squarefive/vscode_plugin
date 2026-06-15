import { ExtensionTranslationConfig } from '../config/readExtensionTranslationConfig';

export interface OpenAICompatibleChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAICompatibleChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

export async function callOpenAICompatibleChatCompletion(
  config: ExtensionTranslationConfig,
  messages: OpenAICompatibleChatMessage[],
  abortSignal?: AbortSignal
): Promise<string> {
  const baseUrl = config.baseUrl.replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.2
    }),
    signal: abortSignal
  });

  const responseText = await response.text();
  const responseJson = responseText.length > 0 ? (JSON.parse(responseText) as OpenAICompatibleChatCompletionResponse) : {};

  if (!response.ok) {
    const providerMessage = responseJson.error?.message ?? response.statusText;
    throw new Error(`LLM request failed with HTTP ${response.status}: ${providerMessage}`);
  }

  const translatedContent = responseJson.choices?.[0]?.message?.content;

  if (!translatedContent) {
    throw new Error('LLM response did not include translated content.');
  }

  return translatedContent.trim();
}
