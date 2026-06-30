import assert from 'node:assert/strict';
import {
  markdownTranslationPromptVersion,
  translateMarkdownDocumentToChinese
} from '../../translation/translateMarkdownDocumentToChinese';
import { buildMarkdownTranslationPrompt } from '../../translation/translateMarkdownSectionToChinese';

suite('Markdown translation orchestration', () => {
  test('uses the v2 technical documentation prompt version', () => {
    const prompt = buildMarkdownTranslationPrompt('简体中文');

    assert.equal(markdownTranslationPromptVersion, 'v2');
    assert.match(prompt, /professional technical documentation translator/);
    assert.match(prompt, /Keep product names, API names, command names, file paths/);
    assert.match(prompt, /Preserve table structure and cell count/);
    assert.match(prompt, /Return only the translated Markdown/);
  });

  test('translates Markdown sections and rebuilds the translated document', async () => {
    const translated = await translateMarkdownDocumentToChinese({
      sourceMarkdown: ['# Install', 'Install the extension.', '', '## Usage', 'Run the command.'].join('\n'),
      sourceUriText: 'file:///docs/readme.md',
      config: {
        baseUrl: 'https://example.test/v1',
        apiKey: 'secret',
        model: 'example-model',
        targetLanguage: '简体中文',
        maxSectionChars: 6000,
        enableCache: false
      },
      readCachedTranslation: async () => undefined,
      writeCachedTranslation: async () => undefined,
      translateMarkdownSection: async (sectionMarkdown) =>
        sectionMarkdown
          .replace('Install', '安装')
          .replace('Install the extension.', '安装插件。')
          .replace('Usage', '用法')
          .replace('Run the command.', '运行命令。')
    });

    assert.equal(translated.translatedMarkdown, '# 安装\n安装插件。\n\n## 用法\n运行命令。');
    assert.equal(translated.usedCache, false);
  });

  test('uses cached translation without calling the section translator', async () => {
    let translationCallCount = 0;

    const translated = await translateMarkdownDocumentToChinese({
      sourceMarkdown: '# Install\nInstall the extension.',
      sourceUriText: 'file:///docs/readme.md',
      config: {
        baseUrl: 'https://example.test/v1',
        apiKey: 'secret',
        model: 'example-model',
        targetLanguage: '简体中文',
        maxSectionChars: 6000,
        enableCache: true
      },
      readCachedTranslation: async () => ({
        sourceHash: 'hash',
        targetLanguage: '简体中文',
        model: 'example-model',
        promptVersion: 'v1',
        cacheSchemaVersion: 'v1',
        createdAt: '2026-06-15T00:00:00.000Z',
        translatedMarkdown: '# 安装\n安装插件。'
      }),
      writeCachedTranslation: async () => undefined,
      translateMarkdownSection: async () => {
        translationCallCount += 1;
        return 'unexpected';
      }
    });

    assert.equal(translated.translatedMarkdown, '# 安装\n安装插件。');
    assert.equal(translated.usedCache, true);
    assert.equal(translationCallCount, 0);
  });

  test('preserves Markdown chunk order when concurrent section translations resolve out of order', async () => {
    const pendingTranslations: Array<{
      sectionMarkdown: string;
      resolveTranslation: (translatedMarkdown: string) => void;
    }> = [];
    const translationPromise = translateMarkdownDocumentToChinese({
      sourceMarkdown: [
        '# One',
        'First section. '.repeat(50),
        '',
        '# Two',
        'Second section. '.repeat(50),
        '',
        '# Three',
        'Third section. '.repeat(50)
      ].join('\n'),
      sourceUriText: 'file:///docs/readme.md',
      config: {
        baseUrl: 'https://example.test/v1',
        apiKey: 'secret',
        model: 'example-model',
        targetLanguage: '简体中文',
        maxSectionChars: 1000,
        enableCache: false
      },
      readCachedTranslation: async () => undefined,
      writeCachedTranslation: async () => undefined,
      translateMarkdownSection: async (sectionMarkdown) =>
        new Promise<string>((resolveTranslation) => {
          pendingTranslations.push({ sectionMarkdown, resolveTranslation });
        })
    });

    await waitForPendingTranslations(pendingTranslations, 3);

    pendingTranslations[2]?.resolveTranslation('# 三\n第三段。');
    pendingTranslations[0]?.resolveTranslation('# 一\n第一段。');
    pendingTranslations[1]?.resolveTranslation('# 二\n第二段。');

    const translated = await translationPromise;

    assert.deepEqual(
      pendingTranslations.map((pendingTranslation) => pendingTranslation.sectionMarkdown.split('\n')[0]),
      ['# One', '# Two', '# Three']
    );
    assert.equal(translated.translatedMarkdown, '# 一\n第一段。\n\n# 二\n第二段。\n\n# 三\n第三段。');
  });

  test('starts all split translations concurrently up to ten sections', async () => {
    const pendingTranslations: Array<{
      sectionMarkdown: string;
      resolveTranslation: (translatedMarkdown: string) => void;
    }> = [];
    const translationPromise = translateMarkdownDocumentToChinese({
      sourceMarkdown: Array.from({ length: 10 }, (_, index) =>
        [`## Section ${index + 1}`, `Section ${index + 1} text. `.repeat(20), ''].join('\n')
      ).join(''),
      sourceUriText: 'file:///docs/readme.md',
      config: {
        baseUrl: 'https://example.test/v1',
        apiKey: 'secret',
        model: 'example-model',
        targetLanguage: '简体中文',
        maxSectionChars: 1000,
        enableCache: false
      },
      readCachedTranslation: async () => undefined,
      writeCachedTranslation: async () => undefined,
      translateMarkdownSection: async (sectionMarkdown) =>
        new Promise<string>((resolveTranslation) => {
          pendingTranslations.push({ sectionMarkdown, resolveTranslation });
        })
    });

    await waitForPendingTranslations(pendingTranslations, 10);

    pendingTranslations.forEach((pendingTranslation, index) => {
      pendingTranslation.resolveTranslation(`## 第 ${index + 1} 节\n译文 ${index + 1}。`);
    });

    const translated = await translationPromise;

    assert.equal(pendingTranslations.length, 10);
    assert.match(translated.translatedMarkdown, /^## 第 1 节/);
    assert.match(translated.translatedMarkdown, /## 第 10 节\n译文 10。$/);
  });

  test('reports progress with one chunk for documents under the size boundary', async () => {
    const progressMessages: string[] = [];

    await translateMarkdownDocumentToChinese({
      sourceMarkdown: '# Install\nInstall the extension.',
      sourceUriText: 'file:///docs/readme.md',
      config: {
        baseUrl: 'https://example.test/v1',
        apiKey: 'secret',
        model: 'example-model',
        targetLanguage: '简体中文',
        maxSectionChars: 6000,
        enableCache: false
      },
      readCachedTranslation: async () => undefined,
      writeCachedTranslation: async () => undefined,
      translateMarkdownSection: async () => '# 安装\n安装插件。',
      reportProgress: (message) => progressMessages.push(message)
    });

    assert.deepEqual(progressMessages, ['Preparing 1 chunk', 'Translating 1 chunk']);
  });

  test('reports progress with three chunks for oversized top-level sections', async () => {
    const progressMessages: string[] = [];

    await translateMarkdownDocumentToChinese({
      sourceMarkdown: [
        '# One',
        'First section. '.repeat(50),
        '',
        '# Two',
        'Second section. '.repeat(50),
        '',
        '# Three',
        'Third section. '.repeat(50)
      ].join('\n'),
      sourceUriText: 'file:///docs/readme.md',
      config: {
        baseUrl: 'https://example.test/v1',
        apiKey: 'secret',
        model: 'example-model',
        targetLanguage: '简体中文',
        maxSectionChars: 1000,
        enableCache: false
      },
      readCachedTranslation: async () => undefined,
      writeCachedTranslation: async () => undefined,
      translateMarkdownSection: async (sectionMarkdown) => sectionMarkdown,
      reportProgress: (message) => progressMessages.push(message)
    });

    assert.deepEqual(progressMessages, ['Preparing 3 chunks', 'Translating 3 chunks']);
  });

  test('reports progress with the actual split section count', async () => {
    const progressMessages: string[] = [];

    await translateMarkdownDocumentToChinese({
      sourceMarkdown: [
        '# Guide',
        'Intro text.',
        '',
        createSecondLevelSection('One'),
        createSecondLevelSection('Two'),
        createSecondLevelSection('Three'),
        createSecondLevelSection('Four')
      ].join('\n'),
      sourceUriText: 'file:///docs/readme.md',
      config: {
        baseUrl: 'https://example.test/v1',
        apiKey: 'secret',
        model: 'example-model',
        targetLanguage: '简体中文',
        maxSectionChars: 1000,
        enableCache: false
      },
      readCachedTranslation: async () => undefined,
      writeCachedTranslation: async () => undefined,
      translateMarkdownSection: async (sectionMarkdown) => sectionMarkdown,
      reportProgress: (message) => progressMessages.push(message)
    });

    assert.deepEqual(progressMessages, ['Preparing 4 chunks', 'Translating 4 chunks']);
  });

  test('falls back to one translation call when heading split exceeds ten sections', async () => {
    const sourceMarkdown = Array.from({ length: 11 }, (_, index) => createSecondLevelSection(`Section ${index + 1}`)).join('');
    const translatedSections: string[] = [];

    const translated = await translateMarkdownDocumentToChinese({
      sourceMarkdown,
      sourceUriText: 'file:///docs/readme.md',
      config: {
        baseUrl: 'https://example.test/v1',
        apiKey: 'secret',
        model: 'example-model',
        targetLanguage: '简体中文',
        maxSectionChars: 1000,
        enableCache: false
      },
      readCachedTranslation: async () => undefined,
      writeCachedTranslation: async () => undefined,
      translateMarkdownSection: async (sectionMarkdown) => {
        translatedSections.push(sectionMarkdown);
        return '# 整篇译文';
      }
    });

    assert.deepEqual(translatedSections, [sourceMarkdown]);
    assert.equal(translated.translatedMarkdown, '# 整篇译文');
  });
});

async function waitForPendingTranslations(
  pendingTranslations: Array<{
    sectionMarkdown: string;
    resolveTranslation: (translatedMarkdown: string) => void;
  }>,
  expectedCount: number
): Promise<void> {
  let attemptCount = 0;

  while (pendingTranslations.length < expectedCount) {
    attemptCount += 1;

    if (attemptCount > 20) {
      throw new Error(`Expected ${expectedCount} pending translations, got ${pendingTranslations.length}.`);
    }

    await new Promise((resolve) => setImmediate(resolve));
  }
}

function createSecondLevelSection(title: string): string {
  return [`## ${title}`, `${title} text. `.repeat(80), ''].join('\n');
}
