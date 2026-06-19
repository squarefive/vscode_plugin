import { ExtensionTranslationConfig } from '../config/readExtensionTranslationConfig';
import { MarkdownTranslationLogger } from '../logging/MarkdownTranslationFileLogger';

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
  abortSignal?: AbortSignal,
  logger?: MarkdownTranslationLogger
): Promise<string> {
  const baseUrl = config.baseUrl.replace(/\/+$/, '');
  const requestStartMs = Date.now();
  const inputChars = messages.reduce((total, message) => total + message.content.length, 0);
  let responseStatus: number | undefined;

  await logger?.info(`llm.request.start baseUrl=${baseUrl} model=${config.model} inputChars=${inputChars}`);

  try {
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
    responseStatus = response.status;

    const responseText = await response.text();
    const responseJson =
      responseText.length > 0 ? (JSON.parse(responseText) as OpenAICompatibleChatCompletionResponse) : {};

    if (!response.ok) {
      const providerMessage = responseJson.error?.message ?? response.statusText;
      await logger?.error(
        `llm.request.error status=${response.status} message=${sanitizeLogValue(providerMessage)} ms=${Date.now() - requestStartMs}`
      );
      throw new Error(`LLM request failed with HTTP ${response.status}: ${providerMessage}`);
    }

    const translatedContent = responseJson.choices?.[0]?.message?.content;

    if (!translatedContent) {
      await logger?.error(`llm.request.error status=${response.status} message=missingTranslatedContent ms=${Date.now() - requestStartMs}`);
      throw new Error('LLM response did not include translated content.');
    }

    const trimmedTranslatedContent = translatedContent.trim();
    await logger?.info(
      `llm.request.end status=${response.status} outputChars=${trimmedTranslatedContent.length} ms=${Date.now() - requestStartMs}`
    );
    return trimmedTranslatedContent;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (!message.startsWith('LLM request failed with HTTP') && message !== 'LLM response did not include translated content.') {
      await logger?.error(
        `llm.request.error status=${responseStatus ?? 'unknown'} message=${sanitizeLogValue(message)} ms=${Date.now() - requestStartMs}`
      );
    }

    throw error;
  }
}

function sanitizeLogValue(value: string): string {
  return value.replace(/\s+/g, ' ');
}
