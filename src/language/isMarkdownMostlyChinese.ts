import { protectMarkdownCodeBlocks } from '../markdown/protectMarkdownCodeBlocks';

const cjkCharacterPattern = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u;
const latinLetterPattern = /[A-Za-z]/u;

export function isMarkdownMostlyChinese(markdown: string): boolean {
  const protectedMarkdown = protectMarkdownCodeBlocks(markdown);
  const textWithoutCodeBlocks = protectedMarkdown.markdownWithProtectedCodeBlocks.replace(
    /__MD_TRANSLATE_CODE_BLOCK_\d+__/g,
    ''
  );
  let cjkCharacterCount = 0;
  let latinLetterCount = 0;

  for (const character of textWithoutCodeBlocks) {
    if (cjkCharacterPattern.test(character)) {
      cjkCharacterCount += 1;
    } else if (latinLetterPattern.test(character)) {
      latinLetterCount += 1;
    }
  }

  const meaningfulCharacterCount = cjkCharacterCount + latinLetterCount;

  if (meaningfulCharacterCount === 0) {
    return false;
  }

  return cjkCharacterCount > latinLetterCount && cjkCharacterCount / meaningfulCharacterCount >= 0.35;
}
