# Markdown Translation Preview Design

## Status

Draft for user review.

## Goal

Build a local Visual Studio Code extension that lets users preview non-Chinese Markdown documents as Simplified Chinese without modifying the source file. The extension translates Markdown through an LLM, caches completed translations outside the workspace, and opens the translated result through VS Code's Markdown preview flow.

## Non-Goals

- Do not inject buttons into VS Code's built-in Markdown preview page in the first version.
- Do not create a custom Webview preview UI in the first version.
- Do not modify the source Markdown file.
- Do not store translation cache files in the workspace.
- Do not bind the extension to one specific LLM vendor SDK.
- Do not implement bilingual side-by-side preview in the first version.

## User Flow

1. The user opens a Markdown document in VS Code.
2. The user triggers the translation preview command from the command palette, editor title bar, or Markdown file context menu.
3. The extension confirms the active document is Markdown.
4. The extension checks whether the document is already mostly Chinese.
5. If the document is mostly Chinese, the extension shows a clear message and does not translate by default.
6. If translation is needed, the extension computes a cache key from the document content and translation configuration.
7. If a cached translation exists, the extension opens the translated virtual Markdown document.
8. If no cached translation exists, the extension parses the Markdown structure, translates sections through the LLM, writes the cache, and opens the translated virtual Markdown document.

## Architecture

The extension uses VS Code-native APIs instead of platform-specific filesystem or shell behavior. Translation results are represented as virtual Markdown documents served by a `TextDocumentContentProvider`. VS Code's built-in Markdown preview then renders those virtual documents.

The design keeps translation, Markdown parsing, caching, configuration, and preview integration in separate modules. File and function names must describe their responsibilities directly so future human and LLM maintainers can understand the code boundaries from names alone.

## VS Code Integration

The first version contributes these commands:

- `mdTranslate.previewChinese`: translate the active Markdown document and open a Chinese preview.
- `mdTranslate.clearCache`: delete all translation cache entries for the extension.
- `mdTranslate.clearCurrentFileCache`: delete cache entries associated with the active Markdown document.

The first version contributes menu entries for:

- Command palette.
- Markdown editor title bar.
- Markdown file context menu.

The extension registers a virtual document provider for a custom scheme:

```text
translated-md://translation-preview/<cacheKey>.md
```

The virtual URI must not embed a local absolute path. The provider uses the cache key to read translated Markdown from extension storage.

## Configuration

The extension exposes these settings:

```json
{
  "mdTranslate.baseUrl": "",
  "mdTranslate.apiKey": "",
  "mdTranslate.model": "",
  "mdTranslate.targetLanguage": "简体中文",
  "mdTranslate.maxSectionChars": 6000,
  "mdTranslate.enableCache": true
}
```

The first version stores `apiKey` in VS Code settings for implementation simplicity. A later version may move secrets into VS Code `SecretStorage`.

## LLM Provider Contract

The first version calls an OpenAI-compatible Chat Completions HTTP endpoint. This means users configure `baseUrl`, `apiKey`, and `model`, and the extension sends requests using the common OpenAI-style request shape.

The extension must not depend on a provider-specific SDK in the first version.

## Markdown Translation Strategy

The extension must not send the entire document as one undifferentiated prompt when avoidable. It should preserve Markdown structure and translate by document section.

The first version uses this strategy:

1. Read the Markdown source text.
2. Protect fenced and indented code blocks from translation.
3. Parse or scan Markdown structure to identify headings and content sections.
4. Split sections primarily by headings such as `#`, `##`, and `###`.
5. Split oversized sections again by paragraph when they exceed `mdTranslate.maxSectionChars`.
6. Translate each translatable section with the LLM.
7. Rebuild the Markdown document in original order.
8. Restore protected code blocks unchanged.

The LLM prompt must instruct the model to:

- Translate to Simplified Chinese.
- Preserve Markdown syntax.
- Preserve heading levels.
- Preserve links, image URLs, anchors, and code blocks.
- Avoid explanations or extra commentary.
- Return only translated Markdown.

## Cache Design

Translations are cached in:

```text
context.globalStorageUri/translation-cache
```

This location is outside the workspace and must not affect Git status.

The cache key is derived from:

- Source Markdown content hash.
- Target language.
- Model name.
- Prompt version.
- Cache schema version.

A cache entry stores:

```json
{
  "sourceHash": "...",
  "targetLanguage": "简体中文",
  "model": "...",
  "promptVersion": "v1",
  "cacheSchemaVersion": "v1",
  "createdAt": "...",
  "translatedMarkdown": "..."
}
```

Cache behavior:

- Reuse cached translation when source content and translation configuration match.
- Re-translate when source content changes.
- Re-translate when model, target language, prompt version, or cache schema changes.
- Do not write a complete cache entry if translation is cancelled or fails.
- If cache write fails, still open the translated preview and show a warning.
- If cache read fails, ignore the entry and re-translate.

## Cross-Platform Requirements

The extension must work on Windows and macOS.

Implementation rules:

- Use `vscode.Uri` and `vscode.Uri.joinPath` for extension storage paths.
- Use `vscode.workspace.fs` for filesystem reads and writes where practical.
- Do not manually concatenate path separators.
- Do not rely on PowerShell, bash, `rm`, `mkdir`, or other platform shell commands at runtime.
- Do not assume case-sensitive or case-insensitive filesystem behavior.
- Do not encode local absolute paths into virtual document URIs.
- Include tests or fixtures that cover Windows-style and POSIX-style path cases where path handling is implemented.

## LLM-Friendly Naming Requirements

Names must describe responsibility clearly. Avoid generic names such as `process`, `handle`, `run`, `parse`, `cache`, or `translate` when more specific names are possible.

Planned module layout:

```text
src/
  extension.ts
  config/
    readExtensionTranslationConfig.ts
  language/
    isMarkdownMostlyChinese.ts
  markdown/
    protectMarkdownCodeBlocks.ts
    splitMarkdownIntoTranslatableSections.ts
    rebuildMarkdownFromTranslatedSections.ts
  llm/
    callOpenAICompatibleChatCompletion.ts
  translation/
    translateMarkdownDocumentToChinese.ts
    translateMarkdownSectionToChinese.ts
  cache/
    createTranslationCacheKey.ts
    readCachedMarkdownTranslation.ts
    writeCachedMarkdownTranslation.ts
    deleteCachedMarkdownTranslations.ts
  preview/
    registerTranslatedMarkdownDocumentProvider.ts
    openTranslatedMarkdownPreview.ts
```

Planned function names:

```text
readExtensionTranslationConfig
validateTranslationConfigIsUsable
isMarkdownDocumentUri
isMarkdownMostlyChinese
protectMarkdownCodeBlocks
splitMarkdownIntoTranslatableSections
splitOversizedMarkdownSection
rebuildMarkdownFromTranslatedSections
createTranslationCacheKey
readCachedMarkdownTranslation
writeCachedMarkdownTranslation
deleteCachedMarkdownTranslations
deleteCachedMarkdownTranslationsForSourceUri
translateMarkdownDocumentToChinese
translateMarkdownSectionToChinese
buildMarkdownTranslationPrompt
callOpenAICompatibleChatCompletion
registerTranslatedMarkdownDocumentProvider
createTranslatedMarkdownVirtualUri
openTranslatedMarkdownPreview
```

## Error Handling

The extension must show actionable errors for:

- Active document is not Markdown.
- Document appears to already be mostly Chinese.
- Missing `baseUrl`.
- Missing `apiKey`.
- Missing `model`.
- LLM authentication failure.
- LLM rate limiting.
- Network failure.
- User cancellation.
- Section translation failure.
- Cache read failure.
- Cache write failure.
- Virtual preview open failure.

Failure rules:

- Never modify the source Markdown document.
- Never write a complete cache entry for a partial failed translation.
- Stop further LLM calls after cancellation.
- Keep error messages specific enough for the user to know what to check next.

## Test Plan

Unit tests should cover:

- `isMarkdownMostlyChinese`.
- Code block protection.
- Markdown section splitting.
- Oversized section splitting.
- Markdown rebuild from translated sections.
- Cache key stability.
- Cache read/write behavior.

Integration-style tests should cover:

- Missing configuration prevents translation with a clear error.
- English Markdown triggers translation.
- Mostly Chinese Markdown does not translate by default.
- Cache miss calls a mock LLM.
- Cache hit does not call the mock LLM.
- Virtual document provider returns translated Markdown.
- Cache clear commands delete expected entries.

Manual validation should cover:

- English Markdown preview translates to Chinese.
- Original Markdown file remains unchanged.
- Code blocks remain unchanged.
- Links and image URLs remain unchanged.
- Repeating the same preview uses cache.
- Editing source Markdown invalidates cache.
- Cache files are outside the workspace and do not affect Git status.

## Acceptance Criteria

- The extension runs in VS Code Extension Host.
- The extension design and implementation are compatible with Windows and macOS.
- A non-Chinese Markdown document can be translated and previewed in Chinese.
- Source Markdown files are never modified by preview translation.
- Translation cache is stored outside the workspace.
- Repeated preview of unchanged content uses cache instead of calling the LLM again.
- Changed source content produces a new translation.
- Code blocks, links, and image URLs are preserved.
- Missing LLM configuration produces clear user-facing guidance.
- Core modules and functions use descriptive, LLM-friendly names.

## Open Decisions

- Whether `apiKey` should move from settings to `SecretStorage` before first release.
- Which Markdown parser library should be used after dependency review.
- Whether mostly Chinese documents should support a force-translate command in the first version.
