import * as vscode from 'vscode';
import { readCachedMarkdownTranslation } from '../cache/readCachedMarkdownTranslation';

export const translatedMarkdownScheme = 'translated-md';

export function registerTranslatedMarkdownDocumentProvider(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.workspace.registerTextDocumentContentProvider(translatedMarkdownScheme, {
    async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
      const cacheKey = uri.path.replace(/^\/+/, '').replace(/\.md$/i, '');
      const cachedTranslation = await readCachedMarkdownTranslation(context.globalStorageUri, cacheKey);

      if (!cachedTranslation) {
        return '# Translation cache entry not found\n\nRun the Markdown translation command again.';
      }

      return cachedTranslation.translatedMarkdown;
    }
  });
}
