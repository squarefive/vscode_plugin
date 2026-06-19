export interface TranslatableMarkdownSection {
  index: number;
  markdown: string;
}

export function splitMarkdownIntoTranslatableSections(
  markdown: string,
  maxSectionChars: number
): TranslatableMarkdownSection[] {
  if (markdown.length <= maxSectionChars) {
    return createIndexedSections([markdown]);
  }

  const topLevelSections = splitMarkdownByTopLevelHeadings(markdown);

  if (topLevelSections.length <= 1) {
    return createIndexedSections([markdown]);
  }

  return createIndexedSections(combineMarkdownSectionsIntoBalancedChunks(topLevelSections, 3));
}

function splitMarkdownByTopLevelHeadings(markdown: string): string[] {
  const topLevelHeadingMatches = Array.from(markdown.matchAll(/^#\s+.+$/gm));

  if (topLevelHeadingMatches.length === 0) {
    return [markdown];
  }

  return topLevelHeadingMatches.map((match, matchIndex) => {
    const sectionStart = matchIndex === 0 ? 0 : match.index ?? 0;
    const nextSectionStart = topLevelHeadingMatches[matchIndex + 1]?.index ?? markdown.length;

    return markdown.slice(sectionStart, nextSectionStart);
  });
}

function combineMarkdownSectionsIntoBalancedChunks(sections: string[], maxChunkCount: number): string[] {
  const chunkCount = Math.min(maxChunkCount, sections.length);
  const targetChunkChars = sections.reduce((total, section) => total + section.length, 0) / chunkCount;
  const chunks: string[] = [];
  let currentChunk = '';

  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    const section = sections[sectionIndex] ?? '';
    const remainingSections = sections.length - sectionIndex;
    const remainingChunks = chunkCount - chunks.length;
    const shouldReserveSectionForLaterChunk =
      remainingChunks > 1 && remainingSections === remainingChunks && currentChunk.length > 0;
    const candidateChunk = currentChunk + section;

    if (
      shouldReserveSectionForLaterChunk ||
      shouldStartNextBalancedChunk(currentChunk, candidateChunk, targetChunkChars, remainingChunks)
    ) {
      chunks.push(currentChunk);
      currentChunk = section;
      continue;
    }

    currentChunk = candidateChunk;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function shouldStartNextBalancedChunk(
  currentChunk: string,
  candidateChunk: string,
  targetChunkChars: number,
  remainingChunks: number
): boolean {
  if (currentChunk.length === 0 || remainingChunks <= 1 || candidateChunk.length <= targetChunkChars) {
    return false;
  }

  return Math.abs(targetChunkChars - currentChunk.length) <= Math.abs(targetChunkChars - candidateChunk.length);
}

function createIndexedSections(markdownSections: string[]): TranslatableMarkdownSection[] {
  return markdownSections
    .filter((section) => section.length > 0)
    .map((section, index) => ({
      index,
      markdown: section
    }));
}
