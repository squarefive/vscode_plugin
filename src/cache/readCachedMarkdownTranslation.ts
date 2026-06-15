import * as vscode from 'vscode';

export interface CachedMarkdownTranslation {
  sourceHash: string;
  sourceUriText?: string;
  targetLanguage: string;
  model: string;
  promptVersion: string;
  cacheSchemaVersion: string;
  createdAt: string;
  translatedMarkdown: string;
}

export function createTranslationCacheDirectoryUri(globalStorageUri: vscode.Uri): vscode.Uri {
  return vscode.Uri.joinPath(globalStorageUri, 'translation-cache');
}

export function createTranslationCacheEntryUri(globalStorageUri: vscode.Uri, cacheKey: string): vscode.Uri {
  return vscode.Uri.joinPath(createTranslationCacheDirectoryUri(globalStorageUri), `${cacheKey}.json`);
}

export async function readCachedMarkdownTranslation(
  globalStorageUri: vscode.Uri,
  cacheKey: string
): Promise<CachedMarkdownTranslation | undefined> {
  const cacheEntryUri = createTranslationCacheEntryUri(globalStorageUri, cacheKey);

  try {
    const cacheBytes = await vscode.workspace.fs.readFile(cacheEntryUri);
    const cacheText = Buffer.from(cacheBytes).toString('utf8');
    return JSON.parse(cacheText) as CachedMarkdownTranslation;
  } catch {
    return undefined;
  }
}
