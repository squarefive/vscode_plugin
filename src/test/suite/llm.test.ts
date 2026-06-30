import assert from 'node:assert/strict';
import { callOpenAICompatibleChatCompletion } from '../../llm/callOpenAICompatibleChatCompletion';

suite('OpenAI-compatible chat completion client', () => {
  const originalFetch = globalThis.fetch;

  teardown(() => {
    globalThis.fetch = originalFetch;
  });

  test('sends thinking disabled in chat completion request body', async () => {
    let requestBody: unknown;

    globalThis.fetch = async (_input, init) => {
      requestBody = JSON.parse(String(init?.body));

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: 'translated'
              }
            }
          ]
        }),
        { status: 200 }
      );
    };

    await callOpenAICompatibleChatCompletion(
      {
        baseUrl: 'https://example.test/v1',
        apiKey: 'secret',
        model: 'example-model',
        targetLanguage: '简体中文',
        maxSectionChars: 1500,
        enableCache: true
      },
      [{ role: 'user', content: 'Translate this.' }]
    );

    assert.deepEqual((requestBody as { thinking?: unknown }).thinking, { type: 'disabled' });
  });

  test('keeps existing OpenAI-compatible request fields while disabling thinking', async () => {
    let requestBody: unknown;

    globalThis.fetch = async (_input, init) => {
      requestBody = JSON.parse(String(init?.body));

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: 'translated'
              }
            }
          ]
        }),
        { status: 200 }
      );
    };

    await callOpenAICompatibleChatCompletion(
      {
        baseUrl: 'https://example.test/v1',
        apiKey: 'secret',
        model: 'example-model',
        targetLanguage: '简体中文',
        maxSectionChars: 1500,
        enableCache: true
      },
      [
        { role: 'system', content: 'Translate Markdown.' },
        { role: 'user', content: '# Title' }
      ]
    );

    assert.deepEqual(requestBody, {
      model: 'example-model',
      messages: [
        { role: 'system', content: 'Translate Markdown.' },
        { role: 'user', content: '# Title' }
      ],
      temperature: 0.2,
      thinking: { type: 'disabled' }
    });
  });
});
