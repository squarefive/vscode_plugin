import assert from 'node:assert/strict';
import * as vscode from 'vscode';

suite('manual DeepSeek preview', () => {
  test('opens translated Markdown preview for README when enabled manually', async function () {
    this.timeout(120000);

    if (process.env.MD_TRANSLATE_MANUAL_DEEPSEEK_PREVIEW !== '1') {
      this.skip();
      return;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, 'Expected a workspace folder for manual preview.');

    const readmeUri = vscode.Uri.joinPath(workspaceFolder.uri, 'README.md');
    const document = await vscode.workspace.openTextDocument(readmeUri);
    await vscode.window.showTextDocument(document);
    await vscode.commands.executeCommand('mdTranslate.previewChinese', readmeUri);
  });
});
