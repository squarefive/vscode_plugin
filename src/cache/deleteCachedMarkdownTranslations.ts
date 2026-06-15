import * as vscode from 'vscode';
import {
  CachedMarkdownTranslation,
  createTranslationCacheDirectoryUri,
  readCachedMarkdownTranslation
} from './readCachedMarkdownTranslation';

export async function deleteCachedMarkdownTranslations(globalStorageUri: vscode.Uri): Promise<void> {
  const cacheDirectoryUri = createTranslationCacheDirectoryUri(globalStorageUri);

  try {
    await vscode.workspace.fs.delete(cacheDirectoryUri, { recursive: true, useTrash: false });
  } catch {
    return;
  }
}

export async function deleteCachedMarkdownTranslationsForSourceUri(
  globalStorageUri: vscode.Uri,
  sourceUriText: string
): Promise<number> {
  const cacheDirectoryUri = createTranslationCacheDirectoryUri(globalStorageUri);
  let deletedCount = 0;

  try {
    const entries = await vscode.workspace.fs.readDirectory(cacheDirectoryUri);

    for (const [entryName, entryType] of entries) {
      if (entryType !== vscode.FileType.File || !entryName.endsWith('.json')) {
        continue;
      }

      const cacheKey = entryName.slice(0, -'.json'.length);
      const cachedTranslation: CachedMarkdownTranslation | undefined = await readCachedMarkdownTranslation(
        globalStorageUri,
        cacheKey
      );

      if (cachedTranslation?.sourceUriText === sourceUriText) {
        await vscode.workspace.fs.delete(vscode.Uri.joinPath(cacheDirectoryUri, entryName), {
          recursive: false,
          useTrash: false
        });
        deletedCount += 1;
      }
    }
  } catch {
    return deletedCount;
  }

  return deletedCount;
}
