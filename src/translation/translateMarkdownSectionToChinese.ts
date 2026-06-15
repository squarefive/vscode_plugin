import { ExtensionTranslationConfig } from '../config/readExtensionTranslationConfig';
import { callOpenAICompatibleChatCompletion } from '../llm/callOpenAICompatibleChatCompletion';

export function buildMarkdownTranslationPrompt(targetLanguage: string): string {
  return [
    'You are a Markdown document translator.',
    `Translate the provided Markdown content into ${targetLanguage}.`,
    'Preserve Markdown syntax, heading levels, tables, blockquotes, lists, links, image URLs, anchors, and code block placeholders.',
    'Do not modify URLs or image paths.',
    'Do not explain, summarize, or add extra commentary.',
    'Return only the translated Markdown.'
  ].join('\n');
}

export async function translateMarkdownSectionToChinese(
  sectionMarkdown: string,
  config: ExtensionTranslationConfig,
  abortSignal?: AbortSignal
): Promise<string> {
  return callOpenAICompatibleChatCompletion(
    config,
    [
      {
        role: 'system',
        content: buildMarkdownTranslationPrompt(config.targetLanguage)
      },
      {
        role: 'user',
        content: sectionMarkdown
      }
    ],
    abortSignal
  );
}
