import { TranslatableMarkdownSection } from './splitMarkdownIntoTranslatableSections';

export function rebuildMarkdownFromTranslatedSections(
  sections: TranslatableMarkdownSection[],
  translatedSectionMarkdown: string[]
): string {
  if (sections.length !== translatedSectionMarkdown.length) {
    throw new Error('Translated section count does not match source section count.');
  }

  return translatedSectionMarkdown.map((section) => section.trimEnd()).join('\n\n');
}
