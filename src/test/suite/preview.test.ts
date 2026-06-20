import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import {
  createTranslatedMarkdownVirtualUri,
  openTranslatedMarkdownPreview
} from '../../preview/openTranslatedMarkdownPreview';
import { resolveTranslatedMarkdownCacheKey } from '../../preview/registerTranslatedMarkdownDocumentProvider';

suite('translated Markdown preview', () => {
  test('creates readable virtual URIs with cache keys in the query', () => {
    const sourceUri = vscode.Uri.file('/docs/README.md');

    const translatedUri = createTranslatedMarkdownVirtualUri({
      cacheKey: 'abc123',
      sourceUri
    });

    assert.equal(translatedUri.scheme, 'translated-md');
    assert.equal(translatedUri.authority, 'translation-preview');
    assert.equal(translatedUri.path, '/README.zh.md');
    assert.equal(resolveTranslatedMarkdownCacheKey(translatedUri), 'abc123');
  });

  test('preserves markdown extension variants in readable preview names', () => {
    const sourceUri = vscode.Uri.file('/docs/Guide.markdown');

    const translatedUri = createTranslatedMarkdownVirtualUri({
      cacheKey: 'abc123',
      sourceUri
    });

    assert.equal(translatedUri.path, '/Guide.zh.markdown');
  });

  test('resolves legacy hash-path cache keys', () => {
    const legacyUri = vscode.Uri.from({
      scheme: 'translated-md',
      authority: 'translation-preview',
      path: '/abc123.md'
    });

    assert.equal(resolveTranslatedMarkdownCacheKey(legacyUri), 'abc123');
  });

  test('opens translated previews in the requested Markdown preview mode', async () => {
    const openedDocuments: vscode.Uri[] = [];
    const executedCommands: Array<{ command: string; args: unknown[] }> = [];
    const originalOpenTextDocument = vscode.workspace.openTextDocument;
    const originalExecuteCommand = vscode.commands.executeCommand;

    (vscode.workspace as unknown as { openTextDocument: (uri: vscode.Uri) => Promise<unknown> }).openTextDocument =
      async (uri) => {
        openedDocuments.push(uri);
        return {};
      };
    (vscode.commands as unknown as { executeCommand: (command: string, ...args: unknown[]) => Promise<unknown> }).executeCommand =
      async (command, ...args) => {
        executedCommands.push({ command, args });
        return undefined;
      };

    try {
      await openTranslatedMarkdownPreview({
        cacheKey: 'abc123',
        sourceUri: vscode.Uri.file('/docs/README.md'),
        openMode: 'beside'
      });
    } finally {
      (vscode.workspace as unknown as { openTextDocument: typeof originalOpenTextDocument }).openTextDocument =
        originalOpenTextDocument;
      (vscode.commands as unknown as { executeCommand: typeof originalExecuteCommand }).executeCommand =
        originalExecuteCommand;
    }

    assert.equal(openedDocuments.length, 1);
    assert.equal(executedCommands.length, 1);
    assert.equal(executedCommands[0]?.command, 'markdown.showPreviewToSide');
    assert.deepEqual(executedCommands[0]?.args.slice(1), [{ locked: true }]);
  });
});
