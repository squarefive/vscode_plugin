import * as vscode from 'vscode';
import {
  CachedMarkdownTranslation,
  createTranslationCacheDirectoryUri,
  createTranslationCacheEntryUri
} from './readCachedMarkdownTranslation';

export async function writeCachedMarkdownTranslation(
  globalStorageUri: vscode.Uri,
  cacheKey: string,
  cachedTranslation: CachedMarkdownTranslation
): Promise<void> {
  const cacheDirectoryUri = createTranslationCacheDirectoryUri(globalStorageUri);
  const cacheEntryUri = createTranslationCacheEntryUri(globalStorageUri, cacheKey);
  const cacheText = JSON.stringify(cachedTranslation, null, 2);

  await vscode.workspace.fs.createDirectory(cacheDirectoryUri);
  await vscode.workspace.fs.writeFile(cacheEntryUri, Buffer.from(cacheText, 'utf8'));
}
