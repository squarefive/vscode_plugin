import { ExtensionTranslationConfig } from '../config/readExtensionTranslationConfig';
import { callOpenAICompatibleChatCompletion } from '../llm/callOpenAICompatibleChatCompletion';
import { MarkdownTranslationLogger } from '../logging/MarkdownTranslationFileLogger';

export function buildMarkdownTranslationPrompt(targetLanguage: string): string {
  return [
    'You are a professional technical documentation translator.',
    `Translate the provided Markdown into ${targetLanguage}.`,
    'Rules:',
    '- Preserve Markdown structure exactly: heading levels, list nesting, table columns, blockquotes, front matter, anchors, links, image URLs, and placeholders.',
    '- Translate prose naturally and accurately for technical documentation.',
    '- Keep product names, API names, command names, file paths, package names, identifiers, environment variables, URLs, and inline code unchanged.',
    '- Do not translate fenced code blocks or protected code block placeholders.',
    '- Preserve Markdown links: translate visible link text when it is natural language, but never change URLs or anchors.',
    '- Preserve table structure and cell count.',
    '- Do not summarize, omit, expand, explain, or add commentary.',
    'Return only the translated Markdown.'
  ].join('\n');
}

export async function translateMarkdownSectionToChinese(
  sectionMarkdown: string,
  config: ExtensionTranslationConfig,
  abortSignal?: AbortSignal,
  logger?: MarkdownTranslationLogger
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
    abortSignal,
    logger
  );
}
