import assert from 'node:assert/strict';
import { translateMarkdownDocumentToChinese } from '../../translation/translateMarkdownDocumentToChinese';

suite('Markdown translation orchestration', () => {
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
