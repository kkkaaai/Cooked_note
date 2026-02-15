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
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop()!; // keep incomplete chunk

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

    // If stream ended without [DONE], still finalize
    onDone();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      // Request was aborted, finalize with what we have
      onDone();
      return;
    }
    onError(error instanceof Error ? error.message : "Stream reading failed");
  }
}

export async function streamChat(
  params: ChatParams,
  onTextDelta: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
  signal?: AbortSignal
): Promise<void> {
  try {
    // Serialize messages: use contentBlocks if present, otherwise plain content string
    const serializedMessages = params.messages.map((m) => ({
      role: m.role,
      content: m.contentBlocks ?? m.content,
    }));

    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: params.documentId,
        messages: serializedMessages,
      }),
      signal,
    });

    if (!res.ok) {
      if (res.status === 402) {
        try {
          const quota = await res.json();
          onError(JSON.stringify(quota));
        } catch {
          onError("Quota exceeded");
        }
        return;
      }
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
