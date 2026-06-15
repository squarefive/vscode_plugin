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
});
