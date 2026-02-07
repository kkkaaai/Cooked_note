import { describe, it, expect, vi, beforeEach } from "vitest";
import { streamChat } from "./ai-client";

// Helper to create a mock SSE ReadableStream
function createSSEStream(events: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(event));
      }
      controller.close();
    },
  });
}

describe("streamChat", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls POST with correct URL and body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: createSSEStream(["data: [DONE]\n\n"]),
    });
    vi.stubGlobal("fetch", mockFetch);

    const messages = [
      { role: "user" as const, content: "What does this mean?" },
      { role: "assistant" as const, content: "It means..." },
      { role: "user" as const, content: "Can you elaborate?" },
    ];

    await streamChat(
      { documentId: "doc-1", messages },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );

    expect(mockFetch).toHaveBeenCalledWith("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: "doc-1",
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
      signal: undefined,
    });
  });

  it("serializes contentBlocks when present", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: createSSEStream(["data: [DONE]\n\n"]),
    });
    vi.stubGlobal("fetch", mockFetch);

    const contentBlocks = [
      { type: "image" as const, source: { type: "base64" as const, media_type: "image/png" as const, data: "abc123" } },
      { type: "text" as const, text: "Explain this" },
    ];

    const messages = [
      {
        role: "user" as const,
        content: "Explain this",
        contentBlocks,
      },
    ];

    await streamChat(
      { documentId: "doc-1", messages },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    // Should use contentBlocks instead of content string
    expect(callBody.messages[0].content).toEqual(contentBlocks);
  });

  it("parses SSE text deltas and calls onTextDelta", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: createSSEStream([
        'data: {"text":"Hello"}\n\n',
        'data: {"text":" world"}\n\n',
        "data: [DONE]\n\n",
      ]),
    });
    vi.stubGlobal("fetch", mockFetch);

    const onTextDelta = vi.fn();
    const onDone = vi.fn();

    await streamChat(
      { documentId: "doc-1", messages: [{ role: "user", content: "hi" }] },
      onTextDelta,
      onDone,
      vi.fn()
    );

    expect(onTextDelta).toHaveBeenCalledWith("Hello");
    expect(onTextDelta).toHaveBeenCalledWith(" world");
    expect(onDone).toHaveBeenCalled();
  });

  it("calls onDone when [DONE] received", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: createSSEStream(["data: [DONE]\n\n"]),
    });
    vi.stubGlobal("fetch", mockFetch);

    const onDone = vi.fn();
    await streamChat(
      { documentId: "doc-1", messages: [{ role: "user", content: "hi" }] },
      vi.fn(),
      onDone,
      vi.fn()
    );

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("calls onError on non-ok response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve("Unauthorized"),
    });
    vi.stubGlobal("fetch", mockFetch);

    const onError = vi.fn();
    await streamChat(
      { documentId: "doc-1", messages: [{ role: "user", content: "hi" }] },
      vi.fn(),
      vi.fn(),
      onError
    );

    expect(onError).toHaveBeenCalledWith("Unauthorized");
  });

  it("calls onError on SSE error event", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: createSSEStream(['data: {"error":"API rate limit"}\n\n']),
    });
    vi.stubGlobal("fetch", mockFetch);

    const onError = vi.fn();
    await streamChat(
      { documentId: "doc-1", messages: [{ role: "user", content: "hi" }] },
      vi.fn(),
      vi.fn(),
      onError
    );

    expect(onError).toHaveBeenCalledWith("API rate limit");
  });

  it("handles abort signal", async () => {
    const controller = new AbortController();
    const mockFetch = vi.fn().mockRejectedValue(
      new DOMException("Aborted", "AbortError")
    );
    vi.stubGlobal("fetch", mockFetch);

    const onDone = vi.fn();
    await streamChat(
      { documentId: "doc-1", messages: [{ role: "user", content: "hi" }] },
      vi.fn(),
      onDone,
      vi.fn(),
      controller.signal
    );

    expect(onDone).toHaveBeenCalled();
  });
});
