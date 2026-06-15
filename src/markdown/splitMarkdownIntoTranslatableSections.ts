export interface TranslatableMarkdownSection {
  index: number;
  markdown: string;
}

export function splitMarkdownIntoTranslatableSections(
  markdown: string,
  maxSectionChars: number
): TranslatableMarkdownSection[] {
  const headingMatches = Array.from(markdown.matchAll(/^#{1,6}\s+.+$/gm));
  const rawSections: string[] = [];

  if (headingMatches.length === 0) {
    rawSections.push(markdown);
  } else {
    const firstHeadingIndex = headingMatches[0].index ?? 0;

    if (firstHeadingIndex > 0) {
      rawSections.push(markdown.slice(0, firstHeadingIndex));
    }

    for (let matchIndex = 0; matchIndex < headingMatches.length; matchIndex += 1) {
      const sectionStart = headingMatches[matchIndex].index ?? 0;
      const nextSectionStart = headingMatches[matchIndex + 1]?.index ?? markdown.length;
      rawSections.push(markdown.slice(sectionStart, nextSectionStart));
    }
  }

  return rawSections
    .flatMap((section) => splitOversizedMarkdownSection(section, maxSectionChars))
    .filter((section) => section.length > 0)
    .map((section, index) => ({
      index,
      markdown: section
    }));
}

export function splitOversizedMarkdownSection(sectionMarkdown: string, maxSectionChars: number): string[] {
  if (sectionMarkdown.length <= maxSectionChars) {
    return [sectionMarkdown];
  }

  const paragraphParts = sectionMarkdown.split(/(\r?\n\s*\r?\n)/);
  const paragraphs: string[] = [];

  for (let index = 0; index < paragraphParts.length; index += 1) {
    const paragraphText = paragraphParts[index] ?? '';
    const paragraphSeparator = paragraphParts[index + 1] ?? '';

    if (paragraphText.length === 0 && paragraphSeparator.length === 0) {
      continue;
    }

    paragraphs.push(paragraphText + paragraphSeparator);

    if (paragraphSeparator.length > 0) {
      index += 1;
    }
  }

  const sections: string[] = [];
  let currentSection = '';

  for (const paragraph of paragraphs) {
    if (currentSection.length > 0 && currentSection.length + paragraph.length > maxSectionChars) {
      sections.push(currentSection);
      currentSection = paragraph;
    } else {
      currentSection += paragraph;
    }
  }

  if (currentSection.length > 0) {
    sections.push(currentSection);
  }

  return sections.length > 0 ? sections : [sectionMarkdown];
}
