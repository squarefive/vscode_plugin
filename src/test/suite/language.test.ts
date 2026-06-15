import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { isMarkdownDocumentUri } from '../../language/isMarkdownDocumentUri';
import { isMarkdownMostlyChinese } from '../../language/isMarkdownMostlyChinese';

suite('language detection', () => {
  test('identifies Markdown document URIs across common extensions', () => {
    assert.equal(isMarkdownDocumentUri(vscode.Uri.file('D:/notes/guide.md')), true);
    assert.equal(isMarkdownDocumentUri(vscode.Uri.file('/Users/me/docs/guide.markdown')), true);
    assert.equal(isMarkdownDocumentUri(vscode.Uri.file('/Users/me/docs/guide.txt')), false);
  });

  test('returns false for primarily English Markdown', () => {
    const markdown = '# Install\n\nThis project explains how to build and run the extension.';

    assert.equal(isMarkdownMostlyChinese(markdown), false);
  });

  test('returns true for primarily Chinese Markdown', () => {
    const markdown = '# 安装\n\n这个项目说明如何构建和运行插件。';

    assert.equal(isMarkdownMostlyChinese(markdown), true);
  });

  test('ignores code blocks when deciding whether Markdown is mostly Chinese', () => {
    const markdown = [
      '# Usage',
      '',
      'This section describes the command.',
      '',
      '```ts',
      'const message = "这是一段很长的中文代码字符串，用来模拟代码块中的文本";',
      '```'
    ].join('\n');

    assert.equal(isMarkdownMostlyChinese(markdown), false);
  });
});
