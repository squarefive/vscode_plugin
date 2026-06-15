import { createSourceMarkdownHash, createTranslationCacheKey } from '../cache/createTranslationCacheKey';
import { CachedMarkdownTranslation } from '../cache/readCachedMarkdownTranslation';
import {
  ExtensionTranslationConfig,
  validateTranslationConfigIsUsable
} from '../config/readExtensionTranslationConfig';
import { isMarkdownMostlyChinese } from '../language/isMarkdownMostlyChinese';
import { protectMarkdownCodeBlocks } from '../markdown/protectMarkdownCodeBlocks';
import { rebuildMarkdownFromTranslatedSections } from '../markdown/rebuildMarkdownFromTranslatedSections';
import { splitMarkdownIntoTranslatableSections } from '../markdown/splitMarkdownIntoTranslatableSections';
import { translateMarkdownSectionToChinese } from './translateMarkdownSectionToChinese';

export const markdownTranslationPromptVersion = 'v1';
export const markdownTranslationCacheSchemaVersion = 'v1';

export interface TranslateMarkdownDocumentInput {
  sourceMarkdown: string;
  sourceUriText: string;
  config: ExtensionTranslationConfig;
  readCachedTranslation: (cacheKey: string) => Promise<CachedMarkdownTranslation | undefined>;
  writeCachedTranslation: (cacheKey: string, cachedTranslation: CachedMarkdownTranslation) => Promise<void>;
  translateMarkdownSection?: (
    sectionMarkdown: string,
    config: ExtensionTranslationConfig,
    abortSignal?: AbortSignal
  ) => Promise<string>;
  abortSignal?: AbortSignal;
  allowMostlyChineseTranslation?: boolean;
}

export interface TranslateMarkdownDocumentResult {
  cacheKey: string;
  translatedMarkdown: string;
  usedCache: boolean;
}

export async function translateMarkdownDocumentToChinese(
  input: TranslateMarkdownDocumentInput
): Promise<TranslateMarkdownDocumentResult> {
  const configError = validateTranslationConfigIsUsable(input.config);

  if (configError) {
    throw new Error(configError);
  }

  if (!input.allowMostlyChineseTranslation && isMarkdownMostlyChinese(input.sourceMarkdown)) {
    throw new Error('Current Markdown document already appears to be mostly Chinese.');
  }

  const cacheKey = createTranslationCacheKey({
    sourceMarkdown: input.sourceMarkdown,
    targetLanguage: input.config.targetLanguage,
    model: input.config.model,
    promptVersion: markdownTranslationPromptVersion,
    cacheSchemaVersion: markdownTranslationCacheSchemaVersion
  });

  if (input.config.enableCache) {
    const cachedTranslation = await input.readCachedTranslation(cacheKey);

    if (cachedTranslation) {
      return {
        cacheKey,
        translatedMarkdown: cachedTranslation.translatedMarkdown,
        usedCache: true
      };
    }
  }

  throwIfTranslationWasCancelled(input.abortSignal);

  const protectedMarkdown = protectMarkdownCodeBlocks(input.sourceMarkdown);
  const sections = splitMarkdownIntoTranslatableSections(
    protectedMarkdown.markdownWithProtectedCodeBlocks,
    input.config.maxSectionChars
  );
  const translateSection = input.translateMarkdownSection ?? translateMarkdownSectionToChinese;
  const translatedSections: string[] = [];

  for (const section of sections) {
    throwIfTranslationWasCancelled(input.abortSignal);
    translatedSections.push(await translateSection(section.markdown, input.config, input.abortSignal));
  }

  const translatedMarkdownWithPlaceholders = rebuildMarkdownFromTranslatedSections(sections, translatedSections);
  const translatedMarkdown = protectedMarkdown.restoreProtectedCodeBlocks(translatedMarkdownWithPlaceholders);

  if (input.config.enableCache) {
    await input.writeCachedTranslation(cacheKey, {
      sourceHash: createSourceMarkdownHash(input.sourceMarkdown),
      sourceUriText: input.sourceUriText,
      targetLanguage: input.config.targetLanguage,
      model: input.config.model,
      promptVersion: markdownTranslationPromptVersion,
      cacheSchemaVersion: markdownTranslationCacheSchemaVersion,
      createdAt: new Date().toISOString(),
      translatedMarkdown
    });
  }

  return {
    cacheKey,
    translatedMarkdown,
    usedCache: false
  };
}

function throwIfTranslationWasCancelled(abortSignal: AbortSignal | undefined): void {
  if (abortSignal?.aborted) {
    throw new Error('Markdown translation was cancelled.');
  }
}
