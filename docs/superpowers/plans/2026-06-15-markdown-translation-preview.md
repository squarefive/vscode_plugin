# Markdown Translation Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows/macOS-compatible TypeScript VS Code extension that translates non-Chinese Markdown documents into Simplified Chinese previews through an OpenAI-compatible LLM and caches translated Markdown outside the workspace.

**Architecture:** The extension separates VS Code activation, configuration, language detection, Markdown section handling, LLM calls, translation orchestration, cache storage, and virtual preview integration. Core logic is implemented in small named modules with unit tests, while VS Code API glue remains thin.

**Tech Stack:** TypeScript, VS Code Extension API, Node 20, npm, Mocha, @vscode/test-electron, esbuild, OpenAI-compatible HTTP API, VS Code `Uri` and `workspace.fs` storage APIs.

---

## File Structure

- Create `package.json`: VS Code extension manifest, scripts, dependencies, commands, menus, and configuration contributions.
- Create `tsconfig.json`: strict TypeScript configuration.
- Create `.vscode/launch.json`: Extension Host launch configuration.
- Create `.vscode/extensions.json`: recommended local development extensions.
- Create `.gitignore`: exclude dependencies, build output, VS Code test artifacts, logs, coverage, and local environment files.
- Create `src/extension.ts`: register commands and preview provider.
- Create `src/config/readExtensionTranslationConfig.ts`: read and validate extension settings.
- Create `src/language/isMarkdownDocumentUri.ts`: identify Markdown documents by URI path.
- Create `src/language/isMarkdownMostlyChinese.ts`: detect whether Markdown text is already mostly Chinese.
- Create `src/markdown/protectMarkdownCodeBlocks.ts`: replace code blocks with stable placeholders and restore them later.
- Create `src/markdown/splitMarkdownIntoTranslatableSections.ts`: split Markdown into heading-oriented sections and oversized chunks.
- Create `src/markdown/rebuildMarkdownFromTranslatedSections.ts`: rebuild Markdown from translated section results.
- Create `src/llm/callOpenAICompatibleChatCompletion.ts`: call an OpenAI-compatible chat completions endpoint.
- Create `src/translation/translateMarkdownSectionToChinese.ts`: build prompts and translate a single Markdown section.
- Create `src/translation/translateMarkdownDocumentToChinese.ts`: orchestrate language detection, cache lookup, section translation, cache write, and preview content production.
- Create `src/cache/createTranslationCacheKey.ts`: create stable cache keys.
- Create `src/cache/readCachedMarkdownTranslation.ts`: read cache entries from extension storage.
- Create `src/cache/writeCachedMarkdownTranslation.ts`: write cache entries to extension storage.
- Create `src/cache/deleteCachedMarkdownTranslations.ts`: clear all cache entries or source-specific cache entries.
- Create `src/preview/registerTranslatedMarkdownDocumentProvider.ts`: register the `translated-md` provider.
- Create `src/preview/openTranslatedMarkdownPreview.ts`: create virtual URIs and open VS Code Markdown preview.
- Create `src/test/**/*.test.ts`: unit and integration-style tests for core behavior.

## Task 1: Project Skeleton

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.vscode/launch.json`
- Create: `.vscode/extensions.json`
- Create: `.gitignore`

- [ ] **Step 1: Add extension manifest and build/test scripts**

Create `package.json` with extension metadata, `mdTranslate.*` configuration, commands, menu entries, and scripts:

```json
{
  "name": "markdown-chinese-preview-translator",
  "displayName": "Markdown Chinese Preview Translator",
  "description": "Preview non-Chinese Markdown documents as Simplified Chinese using an OpenAI-compatible LLM.",
  "version": "0.0.1",
  "publisher": "local",
  "engines": {
    "vscode": "^1.100.0"
  },
  "categories": ["Other"],
  "activationEvents": [
    "onCommand:mdTranslate.previewChinese",
    "onCommand:mdTranslate.clearCache",
    "onCommand:mdTranslate.clearCurrentFileCache"
  ],
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "mdTranslate.previewChinese",
        "title": "Preview Markdown Translation in Chinese",
        "category": "Markdown Translate"
      },
      {
        "command": "mdTranslate.clearCache",
        "title": "Clear All Markdown Translation Cache",
        "category": "Markdown Translate"
      },
      {
        "command": "mdTranslate.clearCurrentFileCache",
        "title": "Clear Current Markdown Translation Cache",
        "category": "Markdown Translate"
      }
    ],
    "menus": {
      "editor/title": [
        {
          "command": "mdTranslate.previewChinese",
          "when": "resourceLangId == markdown",
          "group": "navigation"
        }
      ],
      "editor/context": [
        {
          "command": "mdTranslate.previewChinese",
          "when": "resourceLangId == markdown",
          "group": "navigation"
        }
      ],
      "explorer/context": [
        {
          "command": "mdTranslate.previewChinese",
          "when": "resourceExtname == .md || resourceExtname == .markdown",
          "group": "navigation"
        }
      ]
    },
    "configuration": {
      "title": "Markdown Translate",
      "properties": {
        "mdTranslate.baseUrl": {
          "type": "string",
          "default": "",
          "description": "OpenAI-compatible API base URL, for example https://api.example.com/v1."
        },
        "mdTranslate.apiKey": {
          "type": "string",
          "default": "",
          "description": "API key for the OpenAI-compatible translation provider."
        },
        "mdTranslate.model": {
          "type": "string",
          "default": "",
          "description": "Model name used for Markdown translation."
        },
        "mdTranslate.targetLanguage": {
          "type": "string",
          "default": "简体中文",
          "description": "Target language for Markdown translation."
        },
        "mdTranslate.maxSectionChars": {
          "type": "number",
          "default": 6000,
          "minimum": 1000,
          "description": "Maximum Markdown characters per translation section before paragraph splitting."
        },
        "mdTranslate.enableCache": {
          "type": "boolean",
          "default": true,
          "description": "Enable translation cache stored in the VS Code extension storage directory."
        }
      }
    }
  },
  "scripts": {
    "compile": "node esbuild.mjs",
    "watch": "node esbuild.mjs --watch",
    "typecheck": "tsc --noEmit",
    "test": "npm run compile && node ./out/test/runTest.js"
  },
  "devDependencies": {
    "@types/mocha": "^10.0.10",
    "@types/node": "^20.19.0",
    "@types/vscode": "^1.100.0",
    "@vscode/test-electron": "^2.5.2",
    "esbuild": "^0.25.0",
    "mocha": "^11.0.0",
    "typescript": "^5.8.0"
  }
}
```

- [ ] **Step 2: Add TypeScript, build, launch, and ignore files**

Create `tsconfig.json`, `esbuild.mjs`, `.vscode/launch.json`, `.vscode/extensions.json`, and `.gitignore` so `npm run compile`, `npm run typecheck`, and Extension Host launch work.

- [ ] **Step 3: Install dependencies**

Run: `npm install`

Expected: `package-lock.json` is created and dependencies install successfully.

- [ ] **Step 4: Compile empty extension skeleton**

Run: `npm run compile`

Expected: compile succeeds and writes `dist/extension.js` after `src/extension.ts` is added in later tasks.

## Task 2: Core Tests First

**Files:**
- Create: `src/test/suite/language.test.ts`
- Create: `src/test/suite/markdown.test.ts`
- Create: `src/test/suite/cache.test.ts`
- Create: `src/test/suite/translation.test.ts`
- Create: `src/test/runTest.ts`
- Create: `src/test/suite/index.ts`

- [ ] **Step 1: Write failing tests for language detection**

Tests must assert that English Markdown is not mostly Chinese, Chinese Markdown is mostly Chinese, and code blocks do not dominate the decision.

- [ ] **Step 2: Write failing tests for Markdown section handling**

Tests must assert that code blocks are protected/restored, headings split sections, oversized paragraphs split, and rebuild preserves order.

- [ ] **Step 3: Write failing tests for cache key behavior**

Tests must assert that unchanged content/config produces the same key and changed model/content produces different keys.

- [ ] **Step 4: Write failing tests for translation orchestration with a mock section translator**

Tests must assert that section translation rebuilds a document and that cached results avoid calling the mock translator.

- [ ] **Step 5: Run tests and verify RED**

Run: `npm test`

Expected: tests fail because production modules are missing.

## Task 3: Language and Markdown Core

**Files:**
- Create: `src/language/isMarkdownDocumentUri.ts`
- Create: `src/language/isMarkdownMostlyChinese.ts`
- Create: `src/markdown/protectMarkdownCodeBlocks.ts`
- Create: `src/markdown/splitMarkdownIntoTranslatableSections.ts`
- Create: `src/markdown/rebuildMarkdownFromTranslatedSections.ts`

- [ ] **Step 1: Implement Markdown URI detection**

Use URI path extension checks for `.md`, `.markdown`, `.mdown`, and `.mkd`.

- [ ] **Step 2: Implement Chinese ratio detection**

Remove protected code blocks, count CJK characters and Latin letters, and return true when CJK characters are the dominant meaningful text.

- [ ] **Step 3: Implement code block protection**

Replace fenced and indented code blocks with stable placeholders and return a restoration function.

- [ ] **Step 4: Implement section splitting**

Split by Markdown headings and split oversized sections by blank-line paragraph boundaries.

- [ ] **Step 5: Implement rebuild**

Replace original section content with translated section content in order and restore protected code blocks.

- [ ] **Step 6: Run tests and verify GREEN for core modules**

Run: `npm test`

Expected: language and markdown tests pass.

## Task 4: Cache and Configuration

**Files:**
- Create: `src/config/readExtensionTranslationConfig.ts`
- Create: `src/cache/createTranslationCacheKey.ts`
- Create: `src/cache/readCachedMarkdownTranslation.ts`
- Create: `src/cache/writeCachedMarkdownTranslation.ts`
- Create: `src/cache/deleteCachedMarkdownTranslations.ts`

- [ ] **Step 1: Implement config reader and validator**

Read `mdTranslate.*` settings and return actionable validation messages for missing `baseUrl`, `apiKey`, or `model`.

- [ ] **Step 2: Implement cache key creation**

Use SHA-256 over source content hash, target language, model, prompt version, and cache schema version.

- [ ] **Step 3: Implement cache read/write with VS Code filesystem APIs**

Use `vscode.Uri.joinPath(context.globalStorageUri, 'translation-cache')` and `vscode.workspace.fs`.

- [ ] **Step 4: Implement cache deletion**

Delete all cache entries and source-specific cache entries by metadata when available.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `npm test`

Expected: cache and config tests pass.

## Task 5: LLM and Translation Orchestration

**Files:**
- Create: `src/llm/callOpenAICompatibleChatCompletion.ts`
- Create: `src/translation/translateMarkdownSectionToChinese.ts`
- Create: `src/translation/translateMarkdownDocumentToChinese.ts`

- [ ] **Step 1: Implement OpenAI-compatible HTTP call**

Use Node `fetch`, POST to `${baseUrl}/chat/completions` after normalizing trailing slashes, send bearer token, model, and messages.

- [ ] **Step 2: Implement prompt builder**

Build a prompt that preserves Markdown structure, code blocks, links, image URLs, and returns only translated Markdown.

- [ ] **Step 3: Implement single-section translation**

Call the LLM client for one section and return translated Markdown text.

- [ ] **Step 4: Implement document orchestration**

Validate config, detect mostly Chinese content, check cache, split sections, translate each section with cancellation support, rebuild, write cache, and return translated Markdown plus cache key.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `npm test`

Expected: translation orchestration tests pass.

## Task 6: VS Code Preview Integration

**Files:**
- Create: `src/preview/registerTranslatedMarkdownDocumentProvider.ts`
- Create: `src/preview/openTranslatedMarkdownPreview.ts`
- Modify: `src/extension.ts`

- [ ] **Step 1: Implement virtual document provider**

Register the `translated-md` scheme and resolve translated Markdown from cache key lookups.

- [ ] **Step 2: Implement translated preview opener**

Create `translated-md://translation-preview/<cacheKey>.md`, open the virtual document, and execute `markdown.showPreview`.

- [ ] **Step 3: Register extension commands**

Register preview and cache clear commands in `activate`.

- [ ] **Step 4: Add progress and cancellation**

Wrap translation with `vscode.window.withProgress` and pass cancellation signals through the orchestration layer.

- [ ] **Step 5: Compile and typecheck**

Run: `npm run compile` and `npm run typecheck`

Expected: both pass.

## Task 7: Documentation and Manual Validation

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Update README**

Document installation, local Extension Host run steps, settings, commands, cache behavior, and limitations.

- [ ] **Step 2: Update AGENTS module map**

Mark implemented modules and list main files.

- [ ] **Step 3: Run full verification**

Run:

```powershell
npm run compile
npm run typecheck
npm test
git status --short
```

Expected: compile/typecheck/tests pass, and Git status only shows intended source/docs changes.

- [ ] **Step 4: Commit implementation**

Create a commit after verification with a Chinese Angular-style message summarizing the extension implementation.

