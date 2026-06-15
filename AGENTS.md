# AGENTS.md

## Guideline Index
- `docs/ai-guidelines/AI-CODING-BEHAVIOR.md`: General AI coding behavior rules, including assumption handling, simplicity, surgical changes, and verification-driven execution.
- `docs/ai-guidelines/COLLABORATION-PROTOCOL.md`: User collaboration protocol, including planning requirements, execution confirmation, branch strategy, merge strategy, and commit preferences.

## Project Context
This project is a local Visual Studio Code extension for Markdown document translation workflows. It targets users who preview Markdown documents in VS Code and want non-Chinese Markdown content translated into Chinese through an LLM while avoiding repeated calls for documents that have already been translated.

## Functional Scope And Completeness
| Feature | Status | Notes |
| --- | --- | --- |
| VS Code extension shell | not-started | Local VS Code plugin for Markdown translation preview workflows. |
| Non-Chinese Markdown detection | not-started | Detects whether Markdown content should be translated to Chinese. |
| Translation preview entry point | not-started | Provides a preview action for eligible Markdown documents. |
| LLM translation integration | not-started | Calls an LLM to translate Markdown content into Chinese. |
| Translation cache | not-started | Avoids repeated LLM calls for already translated, unchanged documents. |
| Markdown structure preservation | not-started | Keeps Markdown formatting, code blocks, links, and document structure usable after translation. |

## Module Map
| Module | Responsibility | Main Files | Notes |
| --- | --- | --- | --- |
| Extension activation | Register commands, providers, and VS Code contribution points. | _Not provided._ | Planned VS Code extension entry module. |
| Markdown language detection | Decide whether a Markdown document is non-Chinese. | _Not provided._ | Implementation details not yet provided. |
| Translation service | Call the configured LLM provider and manage prompts/chunking. | _Not provided._ | Provider details not yet provided. |
| Translation cache | Store and retrieve translated Markdown by content and configuration identity. | _Not provided._ | Cache storage mechanism not yet provided. |
| Preview integration | Present translated Markdown in VS Code preview flow. | _Not provided._ | Exact VS Code API approach not yet implemented. |

## Project-Specific Agent Rules
- Treat the extension as a local VS Code plugin for Markdown translation preview.
- Preserve Markdown document structure when implementing translation behavior.
- Cache translations by stable content/configuration identity to prevent unnecessary LLM calls.
- Do not assume a specific LLM provider unless project configuration or user instruction provides one.
