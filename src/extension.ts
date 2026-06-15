import * as vscode from 'vscode';
import { deleteCachedMarkdownTranslations, deleteCachedMarkdownTranslationsForSourceUri } from './cache/deleteCachedMarkdownTranslations';
import { readCachedMarkdownTranslation } from './cache/readCachedMarkdownTranslation';
import { writeCachedMarkdownTranslation } from './cache/writeCachedMarkdownTranslation';
import { readExtensionTranslationConfig } from './config/readExtensionTranslationConfig';
import { isMarkdownDocumentUri } from './language/isMarkdownDocumentUri';
import { openTranslatedMarkdownPreview } from './preview/openTranslatedMarkdownPreview';
import { registerTranslatedMarkdownDocumentProvider } from './preview/registerTranslatedMarkdownDocumentProvider';
import { translateMarkdownDocumentToChinese } from './translation/translateMarkdownDocumentToChinese';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(registerTranslatedMarkdownDocumentProvider(context));
  context.subscriptions.push(
    vscode.commands.registerCommand('mdTranslate.previewChinese', async (resourceUri?: vscode.Uri) => {
      await previewActiveMarkdownDocumentInChinese(context, resourceUri);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('mdTranslate.clearCache', async () => {
      await deleteCachedMarkdownTranslations(context.globalStorageUri);
      vscode.window.showInformationMessage('Markdown translation cache cleared.');
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('mdTranslate.clearCurrentFileCache', async (resourceUri?: vscode.Uri) => {
      const sourceUri = resourceUri ?? vscode.window.activeTextEditor?.document.uri;

      if (!sourceUri) {
        vscode.window.showWarningMessage('Open a Markdown document before clearing its translation cache.');
        return;
      }

      const deletedCount = await deleteCachedMarkdownTranslationsForSourceUri(
        context.globalStorageUri,
        sourceUri.toString()
      );
      vscode.window.showInformationMessage(`Cleared ${deletedCount} Markdown translation cache entries for this file.`);
    })
  );
}

export function deactivate(): void {
  return;
}

async function previewActiveMarkdownDocumentInChinese(
  context: vscode.ExtensionContext,
  resourceUri: vscode.Uri | undefined
): Promise<void> {
  const sourceDocument = await resolveMarkdownDocumentToTranslate(resourceUri);

  if (!sourceDocument) {
    vscode.window.showWarningMessage('Open a Markdown document before running Chinese translation preview.');
    return;
  }

  const abortController = new AbortController();

  try {
    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Translating Markdown to Chinese',
        cancellable: true
      },
      async (_progress, cancellationToken) => {
        const cancellationDisposable = cancellationToken.onCancellationRequested(() => abortController.abort());

        try {
          return await translateMarkdownDocumentToChinese({
            sourceMarkdown: sourceDocument.getText(),
            sourceUriText: sourceDocument.uri.toString(),
            config: readExtensionTranslationConfig(),
            readCachedTranslation: (cacheKey) => readCachedMarkdownTranslation(context.globalStorageUri, cacheKey),
            writeCachedTranslation: (cacheKey, cachedTranslation) =>
              writeCachedMarkdownTranslation(context.globalStorageUri, cacheKey, cachedTranslation),
            abortSignal: abortController.signal
          });
        } finally {
          cancellationDisposable.dispose();
        }
      }
    );

    await openTranslatedMarkdownPreview(result.cacheKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(message);
  }
}

async function resolveMarkdownDocumentToTranslate(resourceUri: vscode.Uri | undefined): Promise<vscode.TextDocument | undefined> {
  const candidateUri = resourceUri ?? vscode.window.activeTextEditor?.document.uri;

  if (!candidateUri || !isMarkdownDocumentUri(candidateUri)) {
    return undefined;
  }

  if (vscode.window.activeTextEditor?.document.uri.toString() === candidateUri.toString()) {
    return vscode.window.activeTextEditor.document;
  }

  return vscode.workspace.openTextDocument(candidateUri);
}
