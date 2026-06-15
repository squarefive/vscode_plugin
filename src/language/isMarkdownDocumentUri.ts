import * as vscode from 'vscode';

const markdownFileExtensions = new Set(['.md', '.markdown', '.mdown', '.mkd']);

export function isMarkdownDocumentUri(uri: vscode.Uri): boolean {
  const lowerPath = uri.path.toLowerCase();
  const extensionMatch = lowerPath.match(/(\.[^./\\]+)$/);

  return extensionMatch !== null && markdownFileExtensions.has(extensionMatch[1]);
}
