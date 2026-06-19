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
| LLM translation integration | implemented | Calls an OpenAI-compatible chat completions endpoint through configured `baseUrl`, `apiKey`, and `model`. |
| Translation cache | implemented | Stores translated Markdown outside the workspace under VS Code extension storage. |
| Markdown structure preservation | partial | Protects code blocks, translates documents whole under the size boundary, and chunks oversized documents by level-one headings into at most three concurrent requests. |
| File logging | implemented | Writes translation flow logs to extension global storage without recording API keys, Markdown bodies, prompts, or full responses. |

## Module Map
| Module | Responsibility | Main Files | Notes |
| --- | --- | --- | --- |
| Extension activation | Register commands, providers, and VS Code contribution points. | `src/extension.ts` | Uses `withProgress` and cancellation for preview translation. |
| Configuration | Read and validate VS Code settings for the translation provider. | `src/config/readExtensionTranslationConfig.ts` | Uses OpenAI-compatible settings. |
| Markdown language detection | Decide whether a Markdown document is already mostly Chinese. | `src/language/isMarkdownDocumentUri.ts`, `src/language/isMarkdownMostlyChinese.ts` | Ignores protected code blocks for language detection. |
| Markdown structure handling | Protect code blocks, create translation chunks, and rebuild translated Markdown. | `src/markdown/protectMarkdownCodeBlocks.ts`, `src/markdown/splitMarkdownIntoTranslatableSections.ts`, `src/markdown/rebuildMarkdownFromTranslatedSections.ts` | Keeps documents whole under the configured boundary; oversized documents are chunked only by level-one headings and balanced into at most three chunks. |
| Translation service | Call the configured LLM provider and manage prompts/chunking. | `src/llm/callOpenAICompatibleChatCompletion.ts`, `src/translation/translateMarkdownSectionToChinese.ts`, `src/translation/translateMarkdownDocumentToChinese.ts` | Runs multiple chunks concurrently and has no provider-specific SDK dependency. |
| Translation cache | Store and retrieve translated Markdown by content and configuration identity. | `src/cache/createTranslationCacheKey.ts`, `src/cache/readCachedMarkdownTranslation.ts`, `src/cache/writeCachedMarkdownTranslation.ts`, `src/cache/deleteCachedMarkdownTranslations.ts` | Cache path is based on `context.globalStorageUri`. |
| Preview integration | Present translated Markdown in VS Code preview flow. | `src/preview/registerTranslatedMarkdownDocumentProvider.ts`, `src/preview/openTranslatedMarkdownPreview.ts` | Uses `translated-md://translation-preview/<cacheKey>.md` virtual documents. |
| File logging | Append translation flow diagnostics outside the workspace. | `src/logging/MarkdownTranslationFileLogger.ts` | Writes `context.globalStorageUri/markdown-translate.log` and avoids sensitive request or document content. |

## Project-Specific Agent Rules
- Treat the extension as a local VS Code plugin for Markdown translation preview.
- Preserve Markdown document structure when implementing translation behavior.
- Cache translations by stable content/configuration identity to prevent unnecessary LLM calls.
- Do not assume a specific LLM provider unless project configuration or user instruction provides one.
- Prefer whole-document translation while the source is under `mdTranslate.maxSectionChars`.
- For oversized documents, chunk only on level-one Markdown headings, balance chunks by character count, and keep LLM calls capped at three.
- Keep translation logs in extension global storage and never log API keys, full Markdown source, prompts, or full model responses.
