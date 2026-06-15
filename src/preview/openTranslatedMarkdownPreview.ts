import * as vscode from 'vscode';
import { translatedMarkdownScheme } from './registerTranslatedMarkdownDocumentProvider';

export function createTranslatedMarkdownVirtualUri(cacheKey: string): vscode.Uri {
  return vscode.Uri.from({
    scheme: translatedMarkdownScheme,
    authority: 'translation-preview',
    path: `/${cacheKey}.md`
  });
}

export async function openTranslatedMarkdownPreview(cacheKey: string): Promise<void> {
  const translatedMarkdownUri = createTranslatedMarkdownVirtualUri(cacheKey);

  await vscode.workspace.openTextDocument(translatedMarkdownUri);
  await vscode.commands.executeCommand('markdown.showPreview', translatedMarkdownUri);
}
