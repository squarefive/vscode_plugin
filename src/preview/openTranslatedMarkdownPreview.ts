import * as vscode from 'vscode';
import { translatedMarkdownScheme } from './registerTranslatedMarkdownDocumentProvider';

export type TranslatedMarkdownPreviewOpenMode = 'current' | 'beside';

export interface TranslatedMarkdownPreviewInput {
  cacheKey: string;
  sourceUri: vscode.Uri;
  openMode: TranslatedMarkdownPreviewOpenMode;
}

export function createTranslatedMarkdownVirtualUri(input: Pick<TranslatedMarkdownPreviewInput, 'cacheKey' | 'sourceUri'>): vscode.Uri {
  return vscode.Uri.from({
    scheme: translatedMarkdownScheme,
    authority: 'translation-preview',
    path: `/${createTranslatedMarkdownPreviewFileName(input.sourceUri)}`,
    query: `cacheKey=${encodeURIComponent(input.cacheKey)}`
  });
}

export async function openTranslatedMarkdownPreview(input: TranslatedMarkdownPreviewInput): Promise<void> {
  const translatedMarkdownUri = createTranslatedMarkdownVirtualUri(input);

  await vscode.workspace.openTextDocument(translatedMarkdownUri);

  if (input.openMode === 'beside') {
    await vscode.commands.executeCommand('markdown.showPreviewToSide', translatedMarkdownUri, { locked: true });
    return;
  }

  await vscode.commands.executeCommand('markdown.showPreview', translatedMarkdownUri, undefined, { locked: true });
}

function createTranslatedMarkdownPreviewFileName(sourceUri: vscode.Uri): string {
  const sourceFileName = sourceUri.path.split('/').filter(Boolean).pop() ?? 'translation.md';
  const markdownExtensionMatch = sourceFileName.match(/(\.markdown|\.md)$/i);

  if (!markdownExtensionMatch) {
    return `${sourceFileName}.zh.md`;
  }

  return `${sourceFileName.slice(0, -markdownExtensionMatch[0].length)}.zh${markdownExtensionMatch[0]}`;
}
