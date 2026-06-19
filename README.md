# vscode_plugin

## Overview
A local Visual Studio Code extension that helps preview non-Chinese Markdown documents in Chinese by calling an LLM and caching translated results.

## Features
- Detect whether a Markdown document is primarily non-Chinese.
- Provide a translation preview entry point for Markdown documents.
- Call an LLM to translate Markdown content into Chinese.
- Cache translated Markdown results to avoid repeated LLM calls for unchanged documents.
- Preserve Markdown structure during translation.
- Translate small and medium Markdown files as one request, while chunking oversized files into at most three concurrent requests.
- Write translation flow logs outside the workspace for performance troubleshooting.

## Project Structure
- `src/extension.ts`: VS Code activation, command registration, and preview flow.
- `src/config/`: VS Code setting reads and validation.
- `src/language/`: Markdown URI checks and mostly-Chinese detection.
- `src/markdown/`: Code block protection, section splitting, and rebuild helpers.
- `src/llm/`: OpenAI-compatible chat completion client.
- `src/translation/`: Markdown translation orchestration.
- `src/cache/`: Stable cache key creation and cache file operations.
- `src/preview/`: Virtual translated Markdown document provider and preview opener.
- `src/logging/`: File logger for translation flow diagnostics.
- `src/test/`: Unit tests and Extension Host test entrypoints.

## Getting Started
1. Install dependencies:

   ```powershell
   npm install
   ```

2. Configure the extension in VS Code settings:

   ```json
   {
     "mdTranslate.baseUrl": "https://api.deepseek.com",
     "mdTranslate.apiKey": "your-api-key",
     "mdTranslate.model": "deepseek-v4-flash",
     "mdTranslate.targetLanguage": "简体中文",
     "mdTranslate.maxSectionChars": 30000,
     "mdTranslate.enableCache": true
   }
   ```

   `mdTranslate.maxSectionChars` defaults to `30000`. Documents at or below this size are translated as one request. Larger documents are chunked only by level-one Markdown headings and balanced into at most three concurrent translation requests.

3. Start the extension from VS Code with the `Run Extension` launch configuration.

4. Open a Markdown file and run `Markdown Translate: Preview Markdown Translation in Chinese` from the command palette, editor title bar, or Markdown context menu.

## Usage
The Markdown editor title includes this translation preview button:

![Translate preview icon](assets/translate-preview.svg)

Use it to open a translated Chinese Markdown preview for the active Markdown document. The same command is also available from the command palette, editor context menu, and explorer context menu.

## Local Install
Package and install the extension locally when you want to use it in normal VS Code windows instead of the Extension Development Host:

```powershell
npm install
npm run package:vsix
code --install-extension markdown-chinese-preview-translator-0.0.1.vsix --force
```

After installation, reload or reopen VS Code and configure `mdTranslate.*` settings in the normal VS Code window.

## Development
- `npm run compile`: bundle the extension and compile TypeScript test output.
- `npm run typecheck`: run TypeScript type checking without emitting files.
- `npm test`: run unit tests with a lightweight VS Code API test stub.
- `npm run test:extension`: run tests inside VS Code Extension Host.
- `npm run package:vsix`: build a local VSIX package for installation into normal VS Code windows.

Translation cache is stored under the VS Code extension `globalStorageUri` directory, not in the workspace, so normal translation preview usage does not affect Git status.

Translation flow logs are stored under the same extension storage directory as `markdown-translate.log`. Logs include cache, chunking, LLM request timing, and preview timing, but do not include API keys, full Markdown source, prompts, or full model responses.
