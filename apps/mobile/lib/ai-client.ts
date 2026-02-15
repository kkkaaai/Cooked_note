import { apiFetch } from "./api";
import type { AIMessage } from "@cookednote/shared/types";

export interface ChatParams {
  documentId: string;
  messages: AIMessage[];
}

async function parseSSEStream(
  response: Response,
  onTextDelta: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): Promise<void> {
  if (!response.body) {
    onError("Response body is empty");
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop()!;

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);

        if (data === "[DONE]") {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(data);
          if (parsed.text) onTextDelta(parsed.text);
          if (parsed.error) onError(parsed.error);
        } catch {
          // Skip unparseable chunks
        }
      }
    }

    onDone();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      onDone();
      return;
    }
    onError(error instanceof Error ? error.message : "Stream reading failed");
  }
}

export async function streamChatMobile(
  params: ChatParams,
  token: string | null,
  onTextDelta: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
  signal?: AbortSignal
): Promise<void> {
  try {
    const serializedMessages = params.messages.map((m) => ({
      role: m.role,
      content: m.contentBlocks ?? m.content,
    }));

    const res = await apiFetch("/api/ai/chat", token, {
      method: "POST",
      body: JSON.stringify({
        documentId: params.documentId,
        messages: serializedMessages,
      }),
      signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      onError(errorText || "Failed to send message");
      return;
    }

    await parseSSEStream(res, onTextDelta, onDone, onError);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      onDone();
      return;
    }
    onError(error instanceof Error ? error.message : "Request failed");
  }
}
