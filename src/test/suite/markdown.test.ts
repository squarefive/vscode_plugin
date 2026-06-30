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

  test('keeps Markdown as one section when length is at or below maxSectionChars', () => {
    const markdown = ['# Title', '', '## One', 'A'.repeat(20), '', '## Two', 'B'.repeat(20)].join('\n');

    const sections = splitMarkdownIntoTranslatableSections(markdown, markdown.length);

    assert.deepEqual(sections.map((section) => section.markdown), [markdown]);
  });

  test('splits oversized Markdown by level-one headings when level one creates multiple sections', () => {
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

  test('splits oversized Markdown by level-two headings when level one cannot split', () => {
    const markdown = [
      '# Guide',
      'Intro text.',
      '',
      '## Install',
      'Install text.',
      '',
      '## Usage',
      'Usage text.'
    ].join('\n');

    const sections = splitMarkdownIntoTranslatableSections(markdown, 10);

    assert.deepEqual(
      sections.map((section) => section.markdown),
      ['# Guide\nIntro text.\n\n## Install\nInstall text.\n\n', '## Usage\nUsage text.']
    );
  });

  test('falls through to level-three headings when higher levels cannot split', () => {
    const markdown = [
      '# Guide',
      '',
      '## Chapter',
      '',
      '### Install',
      'Install text.',
      '',
      '### Usage',
      'Usage text.'
    ].join('\n');

    const sections = splitMarkdownIntoTranslatableSections(markdown, 10);

    assert.deepEqual(
      sections.map((section) => section.markdown),
      ['# Guide\n\n## Chapter\n\n### Install\nInstall text.\n\n', '### Usage\nUsage text.']
    );
  });

  test('keeps leading content with the first split section', () => {
    const markdown = [
      '---',
      'title: Guide',
      '---',
      '',
      '# Guide',
      'Intro text.',
      '',
      '## Install',
      'Install text.',
      '',
      '## Usage',
      'Usage text.'
    ].join('\n');

    const sections = splitMarkdownIntoTranslatableSections(markdown, 10);

    assert.equal(sections.length, 2);
    assert.equal(sections[0]?.markdown, '---\ntitle: Guide\n---\n\n# Guide\nIntro text.\n\n## Install\nInstall text.\n\n');
    assert.equal(sections[1]?.markdown, '## Usage\nUsage text.');
  });

  test('does not merge split sections into balanced chunks', () => {
    const markdown = [
      '# Guide',
      'Intro text.',
      '',
      createSecondLevelSection('One', 'a'),
      createSecondLevelSection('Two', 'b'),
      createSecondLevelSection('Three', 'c'),
      createSecondLevelSection('Four', 'd')
    ].join('\n');

    const sections = splitMarkdownIntoTranslatableSections(markdown, 10);

    assert.deepEqual(
      sections.map((section) => section.markdown.match(/^##\s+/m)?.[0]),
      ['## ', '## ', '## ', '## ']
    );
    assert.equal(sections.length, 4);
  });

  test('falls back to whole document when first splittable heading level creates more than ten sections', () => {
    const markdown = Array.from({ length: 11 }, (_, index) =>
      createSecondLevelSection(`Section ${index + 1}`, String(index % 10))
    ).join('');

    const sections = splitMarkdownIntoTranslatableSections(markdown, 10);

    assert.deepEqual(sections.map((section) => section.markdown), [markdown]);
  });

  test('keeps oversized Markdown as one section when no heading level can split it', () => {
    const markdown = ['Intro', '', '## Install', 'Install text.', '', '## Usage', 'Usage text.'].join('\n');

    const sections = splitMarkdownIntoTranslatableSections(markdown.replace('## Usage', 'Usage'), 10);

    assert.deepEqual(sections.map((section) => section.markdown), [markdown.replace('## Usage', 'Usage')]);
  });

  test('uses the first splittable level even when lower levels also exist', () => {
    const markdown = [
      '# Guide',
      '',
      '## Install',
      '',
      '### Step One',
      'Step one text.',
      '',
      '### Step Two',
      'Step two text.',
      '',
      '## Usage',
      '',
      '### Run',
      'Run text.',
      '',
      '### Verify',
      'Verify text.'
    ].join('\n');

    const sections = splitMarkdownIntoTranslatableSections(markdown, 10);

    assert.equal(sections.length, 2);
    assert.match(sections[0]?.markdown ?? '', /^# Guide\n\n## Install/);
    assert.match(sections[1]?.markdown ?? '', /^## Usage/);
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

function createSecondLevelSection(title: string, repeatedCharacter: string): string {
  return [`## ${title}`, repeatedCharacter.repeat(20), ''].join('\n');
}
