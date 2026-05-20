import type { ModelItem } from '@/features/models/model/modelTypes';
import { addRecord } from '@/hooks/useCallRecords';

interface CallModelInput {
  model: ModelItem;
  prompt: string;
  userContent: string;
  chapterContext?: string;
  recordType?: 'api_test' | 'chat' | 'generate' | 'stream';
}

function normalizeBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/chat/completions')) return trimmed;
  return `${trimmed}/chat/completions`;
}

export async function callModel({
  model,
  prompt,
  userContent,
  chapterContext,
  recordType = 'generate',
}: CallModelInput) {
  if (!model.baseUrl.trim()) throw new Error('Model is missing Base URL');
  if (!model.apiKey.trim()) throw new Error('Model is missing API Key');

  const endpoint = normalizeBaseUrl(model.baseUrl);
  const startedAt = performance.now();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${model.apiKey}`,
    },
    body: JSON.stringify({
      model: model.model || model.id,
      messages: [
        {
          role: 'system',
          content: prompt || 'You are a writing assistant. Answer clearly and concretely.',
        },
        {
          role: 'user',
          content: chapterContext
            ? `Current chapter:\n${chapterContext}\n\nRequest:\n${userContent}`
            : userContent,
        },
      ],
      temperature: 0.7,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    addRecord({
      modelId: model.id,
      modelName: model.name,
      type: recordType,
      status: 'failed',
      latencyMs: Math.round(performance.now() - startedAt),
      endpoint,
      error: errorText.slice(0, 240),
    });
    throw new Error(`Model request failed (${response.status}): ${errorText.slice(0, 240)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Model returned empty content');

  const usage = data?.usage ?? {};
  addRecord({
    modelId: model.id,
    modelName: model.name,
    type: recordType,
    status: 'success',
    latencyMs: Math.round(performance.now() - startedAt),
    endpoint,
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
  });

  return String(content);
}
