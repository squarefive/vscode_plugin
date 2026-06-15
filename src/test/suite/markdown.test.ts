import assert from 'node:assert/strict';
import { protectMarkdownCodeBlocks } from '../../markdown/protectMarkdownCodeBlocks';
import {
  splitMarkdownIntoTranslatableSections,
  splitOversizedMarkdownSection
} from '../../markdown/splitMarkdownIntoTranslatableSections';
import { rebuildMarkdownFromTranslatedSections } from '../../markdown/rebuildMarkdownFromTranslatedSections';

suite('Markdown section handling', () => {
  test('protects and restores fenced code blocks', () => {
    const markdown = ['# Title', '', '```ts', 'const value = "hello";', '```', '', 'Body text.'].join('\n');

    const protectedMarkdown = protectMarkdownCodeBlocks(markdown);

    assert.match(protectedMarkdown.markdownWithProtectedCodeBlocks, /__MD_TRANSLATE_CODE_BLOCK_0__/);
    assert.equal(
      protectedMarkdown.restoreProtectedCodeBlocks(protectedMarkdown.markdownWithProtectedCodeBlocks),
      markdown
    );
  });

  test('splits Markdown into heading-oriented sections', () => {
    const markdown = ['Intro', '', '## Install', 'Install text.', '', '## Usage', 'Usage text.'].join('\n');

    const sections = splitMarkdownIntoTranslatableSections(markdown, 6000);

    assert.deepEqual(
      sections.map((section) => section.markdown),
      ['Intro\n\n', '## Install\nInstall text.\n\n', '## Usage\nUsage text.']
    );
  });

  test('splits oversized sections by paragraph boundaries', () => {
    const section = ['## Long', '', 'First paragraph has enough text.', '', 'Second paragraph has enough text.'].join('\n');

    const sections = splitOversizedMarkdownSection(section, 45);

    assert.equal(sections.length, 2);
    assert.equal(sections[0], '## Long\n\nFirst paragraph has enough text.\n\n');
    assert.equal(sections[1], 'Second paragraph has enough text.');
  });

  test('rebuilds Markdown from translated sections in original order', () => {
    const markdown = ['# Title', 'Hello.', '', '## Next', 'World.'].join('\n');
    const sections = splitMarkdownIntoTranslatableSections(markdown, 6000);

    const rebuilt = rebuildMarkdownFromTranslatedSections(sections, ['# 标题\n你好。', '## 下一个\n世界。']);

    assert.equal(rebuilt, '# 标题\n你好。\n\n## 下一个\n世界。');
  });
});
