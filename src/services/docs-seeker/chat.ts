/**
 * Docs-Seeker 对话服务
 * 注意：docs-seeker 的 /v1/chat 为一次性返回（非流式），
 * 兼容原 chatStream 签名：拿到完整回答后一次性回调 onToken，再回调 onComplete。
 */
import { DOCS_SEEKER_API } from "./constants";
import { docsSeekerFetch } from "./request";
import type { ChatResponse } from "./types";

export async function chatStream(
  question: string,
  onToken: (token: string) => void,
  onComplete?: () => void,
  onError?: (error: Error) => void,
): Promise<void> {
  try {
    const data = await docsSeekerFetch<ChatResponse>(DOCS_SEEKER_API.CHAT, {
      method: "POST",
      body: { question, top_k: 10, use_cache: true },
      timeout: 60000,
    });
    onToken(data.answer ?? "");
    onComplete?.();
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error(String(error)));
  }
}
