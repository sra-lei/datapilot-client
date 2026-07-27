/**
 * CharterMate 对话服务
 */

/**
 * 获取请求 URL
 * 开发和生产环境都使用相对路径
 * - 开发：Vite 代理转发
 * - 生产：Nginx 反向代理转发
 */
const getRequestUrl = (path: string): string => {
  return path;
};

/**
 * 流式对话
 * @param question 用户问题
 * @param onToken 收到 token 的回调函数
 * @param onComplete 完成时的回调函数
 * @param onError 错误回调函数
 * @returns Promise<void>
 */
export async function chatStream(
  question: string,
  onToken: (token: string) => void,
  onComplete?: () => void,
  onError?: (error: Error) => void,
): Promise<void> {
  try {
    const url = getRequestUrl("/api/v1/chat/stream");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is null");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // 解析 SSE 格式: data: xxx\n\n
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.substring(6).trim();

          if (data === "[DONE]") {
            onComplete?.();
            return;
          } else {
            onToken(data);
          }
        }
      }
    }

    onComplete?.();
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error(String(error)));
  }
}
