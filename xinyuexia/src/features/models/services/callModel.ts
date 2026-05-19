import type { ModelItem } from '@/features/models/model/modelTypes';

interface CallModelInput {
  model: ModelItem;
  prompt: string;
  userContent: string;
  chapterContext?: string;
}

function normalizeBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/chat/completions')) return trimmed;
  return `${trimmed}/chat/completions`;
}

export async function callModel({ model, prompt, userContent, chapterContext }: CallModelInput) {
  if (!model.baseUrl.trim()) throw new Error('模型缺少 Base URL');
  if (!model.apiKey.trim()) throw new Error('模型缺少 API Key');

  const response = await fetch(normalizeBaseUrl(model.baseUrl), {
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
          content: prompt || '你是一个中文小说创作助手，回答要具体、可执行、避免空泛。',
        },
        {
          role: 'user',
          content: chapterContext
            ? `【当前章节正文】\n${chapterContext}\n\n【用户请求】\n${userContent}`
            : userContent,
        },
      ],
      temperature: 0.7,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`模型请求失败 (${response.status})：${errorText.slice(0, 240)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('模型没有返回内容');
  return String(content);
}
