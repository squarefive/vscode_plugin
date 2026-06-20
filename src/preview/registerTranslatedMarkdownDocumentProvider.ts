import * as vscode from 'vscode';
import { readCachedMarkdownTranslation } from '../cache/readCachedMarkdownTranslation';

export const translatedMarkdownScheme = 'translated-md';

export function registerTranslatedMarkdownDocumentProvider(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.workspace.registerTextDocumentContentProvider(translatedMarkdownScheme, {
    async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
      const cacheKey = resolveTranslatedMarkdownCacheKey(uri);
      const cachedTranslation = await readCachedMarkdownTranslation(context.globalStorageUri, cacheKey);

      if (!cachedTranslation) {
        return '# Translation cache entry not found\n\nRun the Markdown translation command again for the source document.';
      }

      return cachedTranslation.translatedMarkdown;
    }
  });
}

export function resolveTranslatedMarkdownCacheKey(uri: vscode.Uri): string {
  const queryCacheKey = new URLSearchParams(uri.query).get('cacheKey');

  if (queryCacheKey) {
    return queryCacheKey;
  }

  return uri.path.replace(/^\/+/, '').replace(/\.md$/i, '');
}
