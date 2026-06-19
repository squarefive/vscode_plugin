import { createSourceMarkdownHash, createTranslationCacheKey } from '../cache/createTranslationCacheKey';
import { CachedMarkdownTranslation } from '../cache/readCachedMarkdownTranslation';
import {
  ExtensionTranslationConfig,
  validateTranslationConfigIsUsable
} from '../config/readExtensionTranslationConfig';
import { isMarkdownMostlyChinese } from '../language/isMarkdownMostlyChinese';
import { MarkdownTranslationLogger } from '../logging/MarkdownTranslationFileLogger';
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
    abortSignal?: AbortSignal,
    logger?: MarkdownTranslationLogger
  ) => Promise<string>;
  abortSignal?: AbortSignal;
  allowMostlyChineseTranslation?: boolean;
  logger?: MarkdownTranslationLogger;
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

  const languageDetectionStartMs = Date.now();
  const mostlyChinese = isMarkdownMostlyChinese(input.sourceMarkdown);
  await input.logger?.info(`language.detect.end mostlyChinese=${mostlyChinese} ms=${Date.now() - languageDetectionStartMs}`);

  if (!input.allowMostlyChineseTranslation && mostlyChinese) {
    await input.logger?.info('language.skip reason=mostlyChinese');
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
    const cacheLookupStartMs = Date.now();
    await input.logger?.info(`cache.lookup.start key=${createShortCacheKey(cacheKey)}`);
    const cachedTranslation = await input.readCachedTranslation(cacheKey);

    if (cachedTranslation) {
      await input.logger?.info(`cache.hit key=${createShortCacheKey(cacheKey)} ms=${Date.now() - cacheLookupStartMs}`);
      return {
        cacheKey,
        translatedMarkdown: cachedTranslation.translatedMarkdown,
        usedCache: true
      };
    }

    await input.logger?.info(`cache.miss key=${createShortCacheKey(cacheKey)} ms=${Date.now() - cacheLookupStartMs}`);
  }

  throwIfTranslationWasCancelled(input.abortSignal);

  const chunkingStartMs = Date.now();
  const protectedMarkdown = protectMarkdownCodeBlocks(input.sourceMarkdown);
  const sections = splitMarkdownIntoTranslatableSections(
    protectedMarkdown.markdownWithProtectedCodeBlocks,
    input.config.maxSectionChars
  );
  await input.logger?.info(
    `chunks.created count=${sections.length} chars=[${sections.map((section) => section.markdown.length).join(',')}] ms=${Date.now() - chunkingStartMs}`
  );
  const translateSection = input.translateMarkdownSection ?? translateMarkdownSectionToChinese;

  const translatedSections = await Promise.all(
    sections.map(async (section) => {
      throwIfTranslationWasCancelled(input.abortSignal);
      const chunkStartMs = Date.now();
      await input.logger?.info(
        `chunk.translation.start index=${section.index} total=${sections.length} chars=${section.markdown.length}`
      );

      try {
        const translatedSection = await translateSection(section.markdown, input.config, input.abortSignal, input.logger);
        await input.logger?.info(
          `chunk.translation.end index=${section.index} total=${sections.length} outputChars=${translatedSection.length} ms=${Date.now() - chunkStartMs}`
        );
        return translatedSection;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await input.logger?.error(
          `chunk.translation.error index=${section.index} total=${sections.length} message=${sanitizeLogValue(message)} ms=${Date.now() - chunkStartMs}`
        );
        throw error;
      }
    })
  );

  const translatedMarkdownWithPlaceholders = rebuildMarkdownFromTranslatedSections(sections, translatedSections);
  const translatedMarkdown = protectedMarkdown.restoreProtectedCodeBlocks(translatedMarkdownWithPlaceholders);

  if (input.config.enableCache) {
    const cacheWriteStartMs = Date.now();
    await input.logger?.info(`cache.write.start key=${createShortCacheKey(cacheKey)}`);
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
    await input.logger?.info(`cache.write.end key=${createShortCacheKey(cacheKey)} ms=${Date.now() - cacheWriteStartMs}`);
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

function createShortCacheKey(cacheKey: string): string {
  return cacheKey.slice(0, 8);
}

function sanitizeLogValue(value: string): string {
  return value.replace(/\s+/g, ' ');
}
