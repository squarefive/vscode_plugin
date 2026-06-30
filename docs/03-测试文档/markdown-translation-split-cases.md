# Markdown Translation Split Test Cases

## Purpose

These cases lock the local Markdown translation split boundaries before changing implementation code.

## Rules Under Test

- Documents with `sourceMarkdown.length <= mdTranslate.maxSectionChars` are translated as one section.
- The default `mdTranslate.maxSectionChars` is `1500`.
- Documents above `mdTranslate.maxSectionChars` search heading levels from `#` through `######`.
- The first heading level that creates more than one section is selected.
- If the selected level creates `2` through `10` sections, each section is translated separately.
- If the selected level creates more than `10` sections, the whole document is translated as one section.
- If no heading level creates more than one section, the whole document is translated as one section.
- Split sections are not merged into balanced chunks.
- Up to `10` split sections are started concurrently.
- LLM requests disable DeepSeek thinking by default with `thinking: { "type": "disabled" }`.

## Cases

| Case | Input Shape | Expected Result |
| --- | --- | --- |
| Boundary length | Markdown length is at or below `1500` and contains multiple headings. | One section containing the whole document. |
| Level-one split | Oversized Markdown contains multiple `#` headings. | Split by `#` headings. |
| Level-two split | Oversized Markdown contains one `#` and multiple `##` headings. | Split by `##` headings. |
| Level-three fallback | Oversized Markdown cannot split by `#` or `##`, but has multiple `###` headings. | Split by `###` headings. |
| Leading content | Front matter, a document title, or introduction appears before the selected heading level. | Leading content is included in the first section. |
| No balanced merge | The selected heading level creates four sections. | Return four sections, not three balanced chunks. |
| Too many sections | The selected heading level creates eleven sections. | Return one section containing the whole document. |
| No split headings | Oversized Markdown has no heading level with more than one heading. | Return one section containing the whole document. |
| First splittable level wins | Both `##` and `###` can split the document. | Split by `##`, not `###`. |
| Progress count | Translation creates four sections. | Progress reports `Preparing 4 chunks` and `Translating 4 chunks`. |
| Concurrent section start | Translation creates ten sections. | All ten translation calls are started before any resolves. |
| Too many sections in orchestration | Translation input creates eleven sections. | Translator is called once with the whole document. |
| Concurrent order | Multiple section translations resolve out of order. | Rebuilt Markdown preserves original section order. |
| Thinking disabled | A chat completion request is sent. | Request body includes `thinking: { "type": "disabled" }`. |
| Request compatibility fields | A chat completion request is sent. | Request body still includes `model`, `messages`, and `temperature`. |
