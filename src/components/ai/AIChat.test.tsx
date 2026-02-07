import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AIChat } from "./AIChat";
import { useAIStore } from "@/stores/ai-store";

// Mock the useAIExplain hook
vi.mock("@/hooks/use-ai-explain", () => ({
  useAIExplain: () => ({
    explain: vi.fn(),
    sendFollowUp: mockSendFollowUp,
    cancel: vi.fn(),
  }),
}));

const mockSendFollowUp = vi.fn();

describe("AIChat", () => {
  beforeEach(() => {
    useAIStore.getState().reset();
    vi.clearAllMocks();
  });

  it("renders empty state with input", () => {
    render(<AIChat />);
    expect(
      screen.getByPlaceholderText("Ask a follow-up question...")
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
    const input = screen.getByPlaceholderText("Ask a follow-up question...");
    expect(input).toBeDisabled();
  });

  it("enables input when not streaming", () => {
    useAIStore.setState({ isStreaming: false });
    render(<AIChat />);
    const input = screen.getByPlaceholderText("Ask a follow-up question...");
    expect(input).not.toBeDisabled();
  });

  it("calls sendFollowUp on form submit", () => {
    useAIStore.setState({
      documentId: "doc-1",
      selectedText: "text",
      pageNumber: 1,
    });
    render(<AIChat />);

    const input = screen.getByPlaceholderText("Ask a follow-up question...");
    fireEvent.change(input, { target: { value: "What else?" } });
    fireEvent.submit(input.closest("form")!);

    expect(mockSendFollowUp).toHaveBeenCalledWith("What else?");
  });

  it("clears input after submit", () => {
    useAIStore.setState({
      documentId: "doc-1",
      selectedText: "text",
      pageNumber: 1,
    });
    render(<AIChat />);

    const input = screen.getByPlaceholderText(
      "Ask a follow-up question..."
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Question" } });
    fireEvent.submit(input.closest("form")!);

    expect(input.value).toBe("");
  });

  it("does not submit empty input", () => {
    render(<AIChat />);
    const input = screen.getByPlaceholderText("Ask a follow-up question...");
    fireEvent.submit(input.closest("form")!);
    expect(mockSendFollowUp).not.toHaveBeenCalled();
  });
});
