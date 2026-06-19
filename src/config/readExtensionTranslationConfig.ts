import * as vscode from 'vscode';

export interface ExtensionTranslationConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  targetLanguage: string;
  maxSectionChars: number;
  enableCache: boolean;
}

export function readExtensionTranslationConfig(): ExtensionTranslationConfig {
  const configuration = vscode.workspace.getConfiguration('mdTranslate');

  return {
    baseUrl: configuration.get<string>('baseUrl', '').trim(),
    apiKey: configuration.get<string>('apiKey', '').trim(),
    model: configuration.get<string>('model', '').trim(),
    targetLanguage: configuration.get<string>('targetLanguage', '简体中文').trim() || '简体中文',
    maxSectionChars: configuration.get<number>('maxSectionChars', 30000),
    enableCache: configuration.get<boolean>('enableCache', true)
  };
}

export function validateTranslationConfigIsUsable(config: ExtensionTranslationConfig): string | undefined {
  if (config.baseUrl.length === 0) {
    return 'Missing mdTranslate.baseUrl. Configure an OpenAI-compatible API base URL in VS Code settings.';
  }

  if (config.apiKey.length === 0) {
    return 'Missing mdTranslate.apiKey. Configure an API key in VS Code settings.';
  }

  if (config.model.length === 0) {
    return 'Missing mdTranslate.model. Configure the model name in VS Code settings.';
  }

  if (!Number.isFinite(config.maxSectionChars) || config.maxSectionChars < 1000) {
    return 'mdTranslate.maxSectionChars must be a number greater than or equal to 1000.';
  }

  return undefined;
}
