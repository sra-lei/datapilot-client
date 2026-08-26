/**
 * Docs-Seeker 对话服务
 * docs-seeker 的 /v1/chat 现为 SSE 流式输出（stream=true 默认）：
 *   data: {"type":"meta", ...}    检索来源等元数据
 *   data: {"type":"delta", ...}   增量文本（逐段回调 onToken）
 *   data: {"type":"error", ...}   输入拦截/生成失败
 *   data: {"type":"done", ...}    完整回答与元数据
 * 保持 chatStream(question, onToken, onComplete, onError) 签名不变。
 */
import { DOCS_SEEKER_API } from './constants';
import { getCurrentUserId } from './request';
import type { ChatResponse } from './types';

interface SSEEvent {
  type: 'meta' | 'delta' | 'error' | 'done';
  content?: string;
  message?: string;
  answer?: string;
  [key: string]: unknown;
}

export async function chatStream(
  question: string,
  onToken: (token: string) => void,
  onComplete?: () => void,
  onError?: (error: Error) => void,
): Promise<void> {
  let controller: AbortController | null = null;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const userId = getCurrentUserId();
    if (userId) headers['X-User-ID'] = userId;

    controller = new AbortController();
    const timer = setTimeout(() => controller?.abort(), 60000);

    const response = await fetch(DOCS_SEEKER_API.CHAT, {
      method: 'POST',
      headers,
      body: JSON.stringify({ question, top_k: 10, use_cache: true, stream: true }),
      signal: controller.signal,
    });
    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let emittedAny = false;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // 按 SSE 帧（data: <json>\n\n）切分；一次网络包可能含多帧或半帧
      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const line = frame.split('\n').find((l) => l.startsWith('data:'));
        if (!line) continue;

        let event: SSEEvent;
        try {
          event = JSON.parse(line.slice(5).trim()) as SSEEvent;
        } catch {
          continue; // 忽略无法解析的帧
        }

        if (event.type === 'delta' && event.content) {
          emittedAny = true;
          onToken(event.content);
        } else if (event.type === 'error') {
          throw new Error(event.message ?? '服务端返回错误');
        } else if (event.type === 'done') {
          // done.answer 为最终（脱敏后）权威回答；增量文本已逐段展示，
          // 仅当服务端未产出任何 delta（异常兜底）时才一次性回调完整回答
          const finalAnswer = (event as ChatResponse).answer;
          if (!emittedAny && finalAnswer) {
            onToken(finalAnswer);
          }
          break;
        }
      }
    }
    clearTimeout(timer);
    onComplete?.();
  } catch (error) {
    controller?.abort();
    onError?.(error instanceof Error ? error : new Error(String(error)));
  }
}
