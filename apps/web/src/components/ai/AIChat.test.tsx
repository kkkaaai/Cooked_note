import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AIChat } from "./AIChat";
import { useAIStore } from "@/stores/ai-store";
import type { Screenshot } from "@/types";

// Mock the useAIChat hook
const mockSendMessage = vi.fn();
vi.mock("@/hooks/use-ai-chat", () => ({
  useAIChat: () => ({
    sendMessage: mockSendMessage,
    cancel: vi.fn(),
  }),
}));

function makeScreenshot(overrides: Partial<Screenshot> = {}): Screenshot {
  return {
    id: overrides.id ?? "ss-1",
    base64: overrides.base64 ?? "data:image/png;base64,abc",
    pageNumber: overrides.pageNumber ?? 1,
    region: overrides.region ?? { x: 0.1, y: 0.1, width: 0.5, height: 0.3 },
    createdAt: overrides.createdAt ?? Date.now(),
  };
}

describe("AIChat", () => {
  beforeEach(() => {
    useAIStore.getState().reset();
    vi.clearAllMocks();
  });

  it("renders empty state with guidance text", () => {
    render(<AIChat />);
    expect(
      screen.getByText(/Draw a region on the PDF/)
    ).toBeInTheDocument();
  });

  it("renders user messages", () => {
    useAIStore.setState({
      messages: [{ role: "user", content: "What does this mean?" }],
    });
    render(<AIChat />);
    expect(screen.getByText("What does this mean?")).toBeInTheDocument();
  });

  it("renders assistant messages", () => {
    useAIStore.setState({
      messages: [{ role: "assistant", content: "This means..." }],
    });
    render(<AIChat />);
    expect(screen.getByText("This means...")).toBeInTheDocument();
  });

  it("renders multiple messages in order", () => {
    useAIStore.setState({
      messages: [
        { role: "user", content: "Question 1" },
        { role: "assistant", content: "Answer 1" },
        { role: "user", content: "Question 2" },
      ],
    });
    render(<AIChat />);
    expect(screen.getByText("Question 1")).toBeInTheDocument();
    expect(screen.getByText("Answer 1")).toBeInTheDocument();
    expect(screen.getByText("Question 2")).toBeInTheDocument();
  });

  it("renders screenshot thumbnails in user message bubbles", () => {
    const ss = makeScreenshot({ id: "ss-1", pageNumber: 3 });
    useAIStore.setState({
      messages: [
        {
          role: "user",
          content: "Explain this",
          screenshots: [ss],
        },
      ],
    });
    render(<AIChat />);
    expect(screen.getByAltText("Page 3 capture")).toBeInTheDocument();
  });

  it("shows Thinking indicator when streaming with no text yet", () => {
    useAIStore.setState({ isStreaming: true, streamingText: "" });
    render(<AIChat />);
    expect(screen.getByText("Thinking...")).toBeInTheDocument();
  });

  it("shows streaming text during streaming", () => {
    useAIStore.setState({
      isStreaming: true,
      streamingText: "Partial response...",
    });
    render(<AIChat />);
    expect(screen.getByText("Partial response...")).toBeInTheDocument();
  });

  it("shows error message when error is set", () => {
    useAIStore.setState({ error: "API rate limit exceeded" });
    render(<AIChat />);
    expect(screen.getByText("API rate limit exceeded")).toBeInTheDocument();
  });

  it("disables input during streaming", () => {
    useAIStore.setState({ isStreaming: true });
    render(<AIChat />);
    const input = screen.getByPlaceholderText("Capture a region first, then ask...");
    expect(input).toBeDisabled();
  });

  it("enables input when not streaming", () => {
    useAIStore.setState({ isStreaming: false });
    render(<AIChat />);
    const input = screen.getByPlaceholderText("Capture a region first, then ask...");
    expect(input).not.toBeDisabled();
  });

  it("shows appropriate placeholder when screenshots are attached", () => {
    useAIStore.setState({
      pendingScreenshots: [makeScreenshot()],
    });
    render(<AIChat />);
    expect(
      screen.getByPlaceholderText("Ask about the selected regions...")
    ).toBeInTheDocument();
  });

  it("shows inline screenshot previews in input area", () => {
    useAIStore.setState({
      pendingScreenshots: [makeScreenshot({ id: "ss-1", pageNumber: 2 })],
    });
    render(<AIChat />);
    expect(screen.getByAltText("Page 2")).toBeInTheDocument();
  });

  it("calls sendMessage with text and screenshots on form submit", () => {
    const screenshots = [makeScreenshot({ id: "ss-1" })];
    useAIStore.setState({
      documentId: "doc-1",
      pendingScreenshots: screenshots,
    });
    render(<AIChat />);

    const input = screen.getByPlaceholderText("Ask about the selected regions...");
    fireEvent.change(input, { target: { value: "What is this?" } });
    fireEvent.submit(input.closest("form")!);

    expect(mockSendMessage).toHaveBeenCalledWith("What is this?", screenshots);
  });

  it("clears input after submit", () => {
    useAIStore.setState({
      documentId: "doc-1",
      pendingScreenshots: [makeScreenshot()],
    });
    render(<AIChat />);

    const input = screen.getByPlaceholderText(
      "Ask about the selected regions..."
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Question" } });
    fireEvent.submit(input.closest("form")!);

    expect(input.value).toBe("");
  });

  it("does not submit when no input and no screenshots", () => {
    render(<AIChat />);
    const input = screen.getByPlaceholderText("Capture a region first, then ask...");
    fireEvent.submit(input.closest("form")!);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("allows submit with screenshots but no text", () => {
    const screenshots = [makeScreenshot()];
    useAIStore.setState({
      documentId: "doc-1",
      pendingScreenshots: screenshots,
    });
    render(<AIChat />);

    const input = screen.getByPlaceholderText("Ask about the selected regions...");
    fireEvent.submit(input.closest("form")!);

    expect(mockSendMessage).toHaveBeenCalledWith("", screenshots);
  });
});
