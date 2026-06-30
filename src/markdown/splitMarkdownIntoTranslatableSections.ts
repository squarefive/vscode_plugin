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

  const headingSections = splitMarkdownByFirstSplittableHeadingLevel(markdown);

  if (headingSections.length <= 1 || headingSections.length > 10) {
    return createIndexedSections([markdown]);
  }

  return createIndexedSections(headingSections);
}

function splitMarkdownByFirstSplittableHeadingLevel(markdown: string): string[] {
  for (let headingLevel = 1; headingLevel <= 6; headingLevel += 1) {
    const headingSections = splitMarkdownByHeadingLevel(markdown, headingLevel);

    if (headingSections.length > 1) {
      return headingSections;
    }
  }

  return [markdown];
}

function splitMarkdownByHeadingLevel(markdown: string, headingLevel: number): string[] {
  const headingMarker = '#'.repeat(headingLevel);
  const headingMatches = Array.from(
    markdown.matchAll(new RegExp(`^${headingMarker}\\s+.+$`, 'gm'))
  );

  if (headingMatches.length <= 1) {
    return [markdown];
  }

  return headingMatches.map((match, matchIndex) => {
    const sectionStart = matchIndex === 0 ? 0 : match.index ?? 0;
    const nextSectionStart = headingMatches[matchIndex + 1]?.index ?? markdown.length;

    return markdown.slice(sectionStart, nextSectionStart);
  });
}

function createIndexedSections(markdownSections: string[]): TranslatableMarkdownSection[] {
  return markdownSections
    .filter((section) => section.length > 0)
    .map((section, index) => ({
      index,
      markdown: section
    }));
}
