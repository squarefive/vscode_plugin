import * as vscode from 'vscode';

export interface MarkdownTranslationLogger {
  info(message: string): Promise<void>;
  error(message: string): Promise<void>;
}

export class MarkdownTranslationFileLogger implements MarkdownTranslationLogger {
  private writeQueue: Promise<void> = Promise.resolve();

  public constructor(private readonly globalStorageUri: vscode.Uri) {}

  public async info(message: string): Promise<void> {
    await this.appendLogLine('info', message);
  }

  public async error(message: string): Promise<void> {
    await this.appendLogLine('error', message);
  }

  private async appendLogLine(level: 'info' | 'error', message: string): Promise<void> {
    this.writeQueue = this.writeQueue
      .then(() => this.writeLogLine(level, message))
      .catch(() => undefined);

    await this.writeQueue;
  }

  private async writeLogLine(level: 'info' | 'error', message: string): Promise<void> {
    try {
      const logFileUri = vscode.Uri.joinPath(this.globalStorageUri, 'markdown-translate.log');
      const logLine = `${new Date().toISOString()} ${level} ${message}\n`;
      let previousLogText = '';

      await vscode.workspace.fs.createDirectory(this.globalStorageUri);

      try {
        const previousLogBytes = await vscode.workspace.fs.readFile(logFileUri);
        previousLogText = Buffer.from(previousLogBytes).toString('utf8');
      } catch {
        previousLogText = '';
      }

      await vscode.workspace.fs.writeFile(logFileUri, Buffer.from(previousLogText + logLine, 'utf8'));
    } catch {
      return;
    }
  }
}
