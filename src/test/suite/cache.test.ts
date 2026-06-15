import assert from 'node:assert/strict';
import { createTranslationCacheKey } from '../../cache/createTranslationCacheKey';

suite('translation cache keys', () => {
  test('creates the same key for unchanged source content and translation configuration', () => {
    const firstKey = createTranslationCacheKey({
      sourceMarkdown: '# Hello',
      targetLanguage: '简体中文',
      model: 'example-model',
      promptVersion: 'v1',
      cacheSchemaVersion: 'v1'
    });
    const secondKey = createTranslationCacheKey({
      sourceMarkdown: '# Hello',
      targetLanguage: '简体中文',
      model: 'example-model',
      promptVersion: 'v1',
      cacheSchemaVersion: 'v1'
    });

    assert.equal(firstKey, secondKey);
  });

  test('creates different keys when source content or model changes', () => {
    const baseKey = createTranslationCacheKey({
      sourceMarkdown: '# Hello',
      targetLanguage: '简体中文',
      model: 'example-model',
      promptVersion: 'v1',
      cacheSchemaVersion: 'v1'
    });
    const changedSourceKey = createTranslationCacheKey({
      sourceMarkdown: '# Hello again',
      targetLanguage: '简体中文',
      model: 'example-model',
      promptVersion: 'v1',
      cacheSchemaVersion: 'v1'
    });
    const changedModelKey = createTranslationCacheKey({
      sourceMarkdown: '# Hello',
      targetLanguage: '简体中文',
      model: 'another-model',
      promptVersion: 'v1',
      cacheSchemaVersion: 'v1'
    });

    assert.notEqual(baseKey, changedSourceKey);
    assert.notEqual(baseKey, changedModelKey);
  });
});
