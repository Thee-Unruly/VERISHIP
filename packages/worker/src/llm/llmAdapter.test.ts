import test from 'node:test';
import assert from 'node:assert/strict';
import { GroqProvider, MockFallbackProvider, ProviderChain, createLLMAdapter } from './llmAdapter';

test('GroqProvider formats model and name correctly', () => {
  const provider = new GroqProvider('fake-key', 'openai/gpt-oss-120b');
  assert.equal(provider.name, 'Groq (openai/gpt-oss-120b)');
});

test('MockFallbackProvider returns expected response', async () => {
  const provider = new MockFallbackProvider();
  const res = await provider.complete([{ role: 'user', content: 'test' }]);
  assert.equal(res.thought, 'Navigating and asserting target page accessibility state.');
  assert.equal(res.toolCall?.name, 'assert_condition');
});

test('MockFallbackProvider finishes test when condition satisfied', async () => {
  const provider = new MockFallbackProvider();
  const res = await provider.complete([{ role: 'user', content: 'Finish condition satisfied' }]);
  assert.equal(res.toolCall?.name, 'finish_test');
});

test('ProviderChain falls back when primary provider fails', async () => {
  const failingProvider = {
    name: 'FailingProvider',
    complete: async () => {
      throw new Error('Network error');
    },
  };
  const fallback = new MockFallbackProvider();
  const chain = new ProviderChain([failingProvider, fallback]);

  const res = await chain.complete([{ role: 'user', content: 'hello' }]);
  assert.ok(res.thought);
});

test('createLLMAdapter creates a ProviderChain ending with MockFallbackProvider', async () => {
  const adapter = createLLMAdapter();
  assert.ok(adapter);
  const res = await adapter.complete([{ role: 'user', content: 'hello' }]);
  assert.ok(res.thought);
});
