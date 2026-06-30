# AGENTS.md

## Guideline Index

For planning, local file changes, persistent commands, branch changes, merges,
and commits, read and follow:

- `docs/ai-guidelines/COLLABORATION-PROTOCOL.md`

When the user says "按照规约", "按规约", "给出计划", "先给计划",
or asks for a plan before execution, read that file completely before responding.

## Project Context
This project is a local Visual Studio Code extension for Markdown document translation workflows. It targets users who preview Markdown documents in VS Code and want non-Chinese Markdown content translated into Chinese through an LLM while avoiding repeated calls for documents that have already been translated.

## Functional Scope And Completeness
| Feature | Status | Notes |
| --- | --- | --- |
| VS Code extension shell | implemented | TypeScript extension manifest, activation entry, commands, menu contributions, and Extension Host launch config are present. |
| Non-Chinese Markdown detection | implemented | Detects mostly Chinese Markdown after ignoring protected code blocks. |
| Translation preview entry point | implemented | Provides command palette, Markdown editor title, and Markdown context menu commands. |
| Editor title icon entry point | implemented | Markdown editor title uses a custom document-with-Chinese-character icon for the translation preview command while preserving the full command title for menus and command palette. |
| LLM translation integration | implemented | Calls an OpenAI-compatible chat completions endpoint through configured `baseUrl`, `apiKey`, and `model`. |
| Translation cache | implemented | Stores translated Markdown outside the workspace under VS Code extension storage. |
| Markdown structure preservation | partial | Protects code blocks, translates documents whole under the size boundary, and chunks oversized documents by the first Markdown heading level that creates 2-10 sections. |
| File logging | implemented | Writes translation flow logs to extension global storage without recording API keys, Markdown bodies, prompts, or full responses. |
| Local VSIX packaging | implemented | The extension can be packaged as a VSIX and installed into normal VS Code windows for local use without Extension Host debugging. |

## Module Map
| Module | Responsibility | Main Files | Notes |
| --- | --- | --- | --- |
| Extension activation | Register commands, providers, and VS Code contribution points. | `src/extension.ts` | Uses `withProgress` and cancellation for preview translation. |
| Configuration | Read and validate VS Code settings for the translation provider. | `src/config/readExtensionTranslationConfig.ts` | Uses OpenAI-compatible settings. |
| Markdown language detection | Decide whether a Markdown document is already mostly Chinese. | `src/language/isMarkdownDocumentUri.ts`, `src/language/isMarkdownMostlyChinese.ts` | Ignores protected code blocks for language detection. |
| Markdown structure handling | Protect code blocks, create translation chunks, and rebuild translated Markdown. | `src/markdown/protectMarkdownCodeBlocks.ts`, `src/markdown/splitMarkdownIntoTranslatableSections.ts`, `src/markdown/rebuildMarkdownFromTranslatedSections.ts` | Keeps documents whole under the configured boundary; oversized documents search heading levels from `#` through `######`, use the first level that creates 2-10 sections, and fall back to whole-document translation above 10 sections. |
| Translation service | Call the configured LLM provider and manage prompts/chunking. | `src/llm/callOpenAICompatibleChatCompletion.ts`, `src/translation/translateMarkdownSectionToChinese.ts`, `src/translation/translateMarkdownDocumentToChinese.ts` | Runs split chunks concurrently, disables DeepSeek thinking by default, and has no provider-specific SDK dependency. |
| Translation cache | Store and retrieve translated Markdown by content and configuration identity. | `src/cache/createTranslationCacheKey.ts`, `src/cache/readCachedMarkdownTranslation.ts`, `src/cache/writeCachedMarkdownTranslation.ts`, `src/cache/deleteCachedMarkdownTranslations.ts` | Cache path is based on `context.globalStorageUri`. |
| Preview integration | Present translated Markdown in VS Code preview flow. | `src/preview/registerTranslatedMarkdownDocumentProvider.ts`, `src/preview/openTranslatedMarkdownPreview.ts` | Uses `translated-md://translation-preview/<cacheKey>.md` virtual documents and exposes the preview command through a custom editor title icon. |
| File logging | Append translation flow diagnostics outside the workspace. | `src/logging/MarkdownTranslationFileLogger.ts` | Writes `context.globalStorageUri/markdown-translate.log` and avoids sensitive request or document content. |

## Project-Specific Agent Rules
- Treat the extension as a local VS Code plugin for Markdown translation preview.
- Preserve Markdown document structure when implementing translation behavior.
- Cache translations by stable content/configuration identity to prevent unnecessary LLM calls.
- Do not assume a specific LLM provider unless project configuration or user instruction provides one.
- Prefer whole-document translation while the source is under `mdTranslate.maxSectionChars`.
- For oversized documents, search heading levels from `#` through `######` and use the first level that creates multiple sections.
- If the first splittable heading level creates 2-10 sections, translate those sections concurrently without balanced merging.
- If the first splittable heading level creates more than 10 sections, or no heading level can split the document, translate the whole document.
- Keep translation logs in extension global storage and never log API keys, full Markdown source, prompts, or full model responses.
- Keep the Markdown translation editor title entry point icon-only by using the custom icon asset; do not shorten the command title just to improve toolbar display.
- Keep progress UI minimal but useful: show major translation stages and include the chunk count when translating.
- Keep local-use documentation centered on VSIX packaging and installation instead of long-term Extension Host debugging.
