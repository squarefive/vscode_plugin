export interface ProtectedMarkdownCodeBlocks {
  markdownWithProtectedCodeBlocks: string;
  restoreProtectedCodeBlocks: (markdown: string) => string;
}

interface StoredCodeBlock {
  placeholder: string;
  content: string;
}

export function protectMarkdownCodeBlocks(markdown: string): ProtectedMarkdownCodeBlocks {
  const lines = markdown.split(/(\r?\n)/);
  const outputParts: string[] = [];
  const storedCodeBlocks: StoredCodeBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';
    const nextNewline = lines[index + 1] ?? '';
    const fencedStart = line.match(/^(\s*)(```|~~~)/);
    const indentedStart = /^( {4}|\t)\S/.test(line);

    if (fencedStart) {
      const fenceMarker = fencedStart[2];
      const blockParts: string[] = [];

      blockParts.push(line, nextNewline);
      index += 2;

      while (index < lines.length) {
        const blockLine = lines[index] ?? '';
        const blockNewline = lines[index + 1] ?? '';
        blockParts.push(blockLine, blockNewline);
        index += 2;

        if (blockLine.trimStart().startsWith(fenceMarker)) {
          break;
        }
      }

      const placeholder = `__MD_TRANSLATE_CODE_BLOCK_${storedCodeBlocks.length}__`;
      storedCodeBlocks.push({ placeholder, content: blockParts.join('') });
      outputParts.push(placeholder);
      continue;
    }

    if (indentedStart) {
      const blockParts: string[] = [];

      while (index < lines.length) {
        const blockLine = lines[index] ?? '';
        const blockNewline = lines[index + 1] ?? '';

        if (!/^( {4}|\t)/.test(blockLine) && blockLine.trim() !== '') {
          break;
        }

        blockParts.push(blockLine, blockNewline);
        index += 2;
      }

      const placeholder = `__MD_TRANSLATE_CODE_BLOCK_${storedCodeBlocks.length}__`;
      storedCodeBlocks.push({ placeholder, content: blockParts.join('') });
      outputParts.push(placeholder);
      continue;
    }

    outputParts.push(line, nextNewline);
    index += 2;
  }

  return {
    markdownWithProtectedCodeBlocks: outputParts.join(''),
    restoreProtectedCodeBlocks: (markdownWithPlaceholders: string) =>
      storedCodeBlocks.reduce(
        (restoredMarkdown, codeBlock) => restoredMarkdown.replaceAll(codeBlock.placeholder, codeBlock.content),
        markdownWithPlaceholders
      )
  };
}
