import * as vscode from 'vscode';
import { deleteCachedMarkdownTranslations, deleteCachedMarkdownTranslationsForSourceUri } from './cache/deleteCachedMarkdownTranslations';
import { readCachedMarkdownTranslation } from './cache/readCachedMarkdownTranslation';
import { writeCachedMarkdownTranslation } from './cache/writeCachedMarkdownTranslation';
import { readExtensionTranslationConfig } from './config/readExtensionTranslationConfig';
import { isMarkdownDocumentUri } from './language/isMarkdownDocumentUri';
import { MarkdownTranslationFileLogger } from './logging/MarkdownTranslationFileLogger';
import { openTranslatedMarkdownPreview, TranslatedMarkdownPreviewOpenMode } from './preview/openTranslatedMarkdownPreview';
import { registerTranslatedMarkdownDocumentProvider } from './preview/registerTranslatedMarkdownDocumentProvider';
import { translateMarkdownDocumentToChinese } from './translation/translateMarkdownDocumentToChinese';

export function activate(context: vscode.ExtensionContext): void {
  const logger = new MarkdownTranslationFileLogger(context.globalStorageUri);

  context.subscriptions.push(registerTranslatedMarkdownDocumentProvider(context));
  context.subscriptions.push(
    vscode.commands.registerCommand('mdTranslate.previewChinese', async (resourceUri?: vscode.Uri) => {
      await previewActiveMarkdownDocumentInChinese(context, resourceUri, 'current', logger);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('mdTranslate.previewChineseToSide', async (resourceUri?: vscode.Uri) => {
      await previewActiveMarkdownDocumentInChinese(context, resourceUri, 'beside', logger);
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
  resourceUri: vscode.Uri | undefined,
  openMode: TranslatedMarkdownPreviewOpenMode,
  logger: MarkdownTranslationFileLogger
): Promise<void> {
  const commandStartMs = Date.now();
  const sourceDocument = await resolveMarkdownDocumentToTranslate(resourceUri);

  if (!sourceDocument) {
    vscode.window.showWarningMessage('Open a Markdown document before running Chinese translation preview.');
    return;
  }

  const sourceMarkdown = sourceDocument.getText();
  const abortController = new AbortController();

  try {
    const config = readExtensionTranslationConfig();
    await logger.info(`command.start source=${sourceDocument.uri.toString()} chars=${sourceMarkdown.length}`);
    await logger.info(
      `config baseUrl=${config.baseUrl} model=${config.model} target=${config.targetLanguage} maxSectionChars=${config.maxSectionChars} cache=${config.enableCache}`
    );

    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Translating Markdown to Chinese',
        cancellable: true
      },
      async (progress, cancellationToken) => {
        const cancellationDisposable = cancellationToken.onCancellationRequested(() => abortController.abort());

        try {
          const result = await translateMarkdownDocumentToChinese({
            sourceMarkdown,
            sourceUriText: sourceDocument.uri.toString(),
            config,
            readCachedTranslation: (cacheKey) => readCachedMarkdownTranslation(context.globalStorageUri, cacheKey),
            writeCachedTranslation: (cacheKey, cachedTranslation) =>
              writeCachedMarkdownTranslation(context.globalStorageUri, cacheKey, cachedTranslation),
            abortSignal: abortController.signal,
            logger,
            reportProgress: (message) => progress.report({ message })
          });

          const previewStartMs = Date.now();
          await logger.info('preview.open.start');
          progress.report({ message: 'Opening preview' });
          await openTranslatedMarkdownPreview({
            cacheKey: result.cacheKey,
            sourceUri: sourceDocument.uri,
            openMode
          });
          await logger.info(`preview.open.end ms=${Date.now() - previewStartMs}`);

          return result;
        } finally {
          cancellationDisposable.dispose();
        }
      }
    );

    await logger.info(`command.end usedCache=${result.usedCache} ms=${Date.now() - commandStartMs}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logger.error(`command.error message=${sanitizeLogValue(message)} ms=${Date.now() - commandStartMs}`);
    vscode.window.showErrorMessage(message);
  }
}

function sanitizeLogValue(value: string): string {
  return value.replace(/\s+/g, ' ');
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
