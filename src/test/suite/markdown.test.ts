import assert from 'node:assert/strict';
import { protectMarkdownCodeBlocks } from '../../markdown/protectMarkdownCodeBlocks';
import { splitMarkdownIntoTranslatableSections } from '../../markdown/splitMarkdownIntoTranslatableSections';
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

  test('keeps Markdown as one translation chunk when it is under the size boundary', () => {
    const markdown = ['Intro', '', '## Install', 'Install text.', '', '## Usage', 'Usage text.'].join('\n');

    const sections = splitMarkdownIntoTranslatableSections(markdown, 6000);

    assert.deepEqual(sections.map((section) => section.markdown), [markdown]);
  });

  test('splits oversized Markdown only on level-one headings', () => {
    const markdown = [
      '# Install',
      'Install text.',
      '',
      '## Usage',
      'Usage text.',
      '',
      '# Reference',
      'Reference text.'
    ].join('\n');

    const sections = splitMarkdownIntoTranslatableSections(markdown, 10);

    assert.equal(sections.length, 2);
    assert.equal(sections[0]?.markdown, '# Install\nInstall text.\n\n## Usage\nUsage text.\n\n');
    assert.equal(sections[1]?.markdown, '# Reference\nReference text.');
  });

  test('combines level-one sections into at most three balanced chunks', () => {
    const markdown = [
      createTopLevelSection('One', 'a'),
      createTopLevelSection('Two', 'b'),
      createTopLevelSection('Three', 'c'),
      createTopLevelSection('Four', 'd'),
      createTopLevelSection('Five', 'e'),
      createTopLevelSection('Six', 'f')
    ].join('');

    const sections = splitMarkdownIntoTranslatableSections(markdown, 10);

    assert.deepEqual(
      sections.map((section) => section.markdown.match(/^#\s+/gm)?.length),
      [2, 2, 2]
    );
  });

  test('keeps oversized Markdown without level-one headings as one translation chunk', () => {
    const markdown = ['Intro', '', '## Install', 'Install text.', '', '## Usage', 'Usage text.'].join('\n');

    const sections = splitMarkdownIntoTranslatableSections(markdown, 10);

    assert.deepEqual(sections.map((section) => section.markdown), [markdown]);
  });

  test('rebuilds Markdown from translated sections in original order', () => {
    const markdown = ['# Title', 'Hello.', '', '# Next', 'World.'].join('\n');
    const sections = splitMarkdownIntoTranslatableSections(markdown, 10);

    const rebuilt = rebuildMarkdownFromTranslatedSections(sections, ['# 标题\n你好。', '## 下一个\n世界。']);

    assert.equal(rebuilt, '# 标题\n你好。\n\n## 下一个\n世界。');
  });
});

function createTopLevelSection(title: string, repeatedCharacter: string): string {
  return [`# ${title}`, repeatedCharacter.repeat(20), ''].join('\n');
}
