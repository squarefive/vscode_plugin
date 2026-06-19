import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import * as vscode from 'vscode';
import { readCachedMarkdownTranslation } from '../../cache/readCachedMarkdownTranslation';
import { writeCachedMarkdownTranslation } from '../../cache/writeCachedMarkdownTranslation';
import {
  ExtensionTranslationConfig,
  readExtensionTranslationConfig
} from '../../config/readExtensionTranslationConfig';
import { MarkdownTranslationFileLogger } from '../../logging/MarkdownTranslationFileLogger';
import { translateMarkdownDocumentToChinese } from '../../translation/translateMarkdownDocumentToChinese';

suite('manual real Markdown translation', () => {
  test('translates a specified Markdown document with the configured real LLM', async function () {
    this.timeout(180000);

    if (process.env.MD_TRANSLATE_MANUAL_REAL_TRANSLATION !== '1') {
      this.skip();
      return;
    }

    const sourceUri = resolveManualSourceMarkdownUri();
    const sourceDocument = await vscode.workspace.openTextDocument(sourceUri);
    const globalStorageUri = getManualGlobalStorageUri();
    const logger = new MarkdownTranslationFileLogger(globalStorageUri);
    const result = await translateMarkdownDocumentToChinese({
      sourceMarkdown: sourceDocument.getText(),
      sourceUriText: sourceDocument.uri.toString(),
      config: createManualTranslationConfig(),
      readCachedTranslation: (cacheKey) => readCachedMarkdownTranslation(globalStorageUri, cacheKey),
      writeCachedTranslation: (cacheKey, cachedTranslation) =>
        writeCachedMarkdownTranslation(globalStorageUri, cacheKey, cachedTranslation),
      logger
    });

    assert.equal(result.translatedMarkdown.length > 0, true);
    assert.notEqual(result.translatedMarkdown, sourceDocument.getText());

    const resultUri = vscode.Uri.joinPath(globalStorageUri, 'manual-translation-result.md');

    await vscode.workspace.fs.writeFile(resultUri, Buffer.from(result.translatedMarkdown, 'utf8'));
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(resultUri));
  });
});

function resolveManualSourceMarkdownUri(): vscode.Uri {
  const sourceFilePath = process.env.MD_TRANSLATE_MANUAL_SOURCE_FILE;

  if (sourceFilePath) {
    return vscode.Uri.file(sourceFilePath);
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(
    workspaceFolder,
    'Set MD_TRANSLATE_MANUAL_SOURCE_FILE or open a workspace with a README.md file.'
  );

  return vscode.Uri.joinPath(workspaceFolder.uri, 'README.md');
}

function getManualGlobalStorageUri(): vscode.Uri {
  const globalStoragePath = process.env.MD_TRANSLATE_MANUAL_STORAGE_DIR;

  if (globalStoragePath) {
    return vscode.Uri.file(globalStoragePath);
  }

  return vscode.Uri.file(path.join(os.tmpdir(), 'markdown-chinese-preview-translator-manual'));
}

function createManualTranslationConfig(): ExtensionTranslationConfig {
  const configuredSettings = readExtensionTranslationConfig();

  return {
    baseUrl: process.env.MD_TRANSLATE_BASE_URL ?? configuredSettings.baseUrl,
    apiKey: process.env.MD_TRANSLATE_API_KEY ?? configuredSettings.apiKey,
    model: process.env.MD_TRANSLATE_MODEL ?? configuredSettings.model,
    targetLanguage: process.env.MD_TRANSLATE_TARGET_LANGUAGE ?? configuredSettings.targetLanguage,
    maxSectionChars: Number(process.env.MD_TRANSLATE_MAX_SECTION_CHARS ?? configuredSettings.maxSectionChars),
    enableCache: process.env.MD_TRANSLATE_ENABLE_CACHE
      ? process.env.MD_TRANSLATE_ENABLE_CACHE === '1'
      : configuredSettings.enableCache
  };
}
