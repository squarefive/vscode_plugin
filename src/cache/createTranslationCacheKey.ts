import crypto from 'node:crypto';

export interface TranslationCacheKeyInput {
  sourceMarkdown: string;
  targetLanguage: string;
  model: string;
  promptVersion: string;
  cacheSchemaVersion: string;
}

export function createSourceMarkdownHash(sourceMarkdown: string): string {
  return crypto.createHash('sha256').update(sourceMarkdown, 'utf8').digest('hex');
}

export function createTranslationCacheKey(input: TranslationCacheKeyInput): string {
  const sourceHash = createSourceMarkdownHash(input.sourceMarkdown);
  const cacheIdentity = JSON.stringify({
    sourceHash,
    targetLanguage: input.targetLanguage,
    model: input.model,
    promptVersion: input.promptVersion,
    cacheSchemaVersion: input.cacheSchemaVersion
  });

  return crypto.createHash('sha256').update(cacheIdentity, 'utf8').digest('hex');
}
