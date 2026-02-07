import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AISidebar } from "./AISidebar";
import { useAIStore } from "@/stores/ai-store";

describe("AISidebar", () => {
  beforeEach(() => {
    useAIStore.getState().reset();
  });

  it("renders nothing when sidebar is closed", () => {
    const { container } = render(<AISidebar />);
    expect(container.firstChild).toBeNull();
  });

  it("renders header when sidebar is open", () => {
    useAIStore.setState({ isSidebarOpen: true });
    render(<AISidebar />);
    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
  });

  it("renders close button", () => {
    useAIStore.setState({ isSidebarOpen: true });
    render(<AISidebar />);
    expect(screen.getByTitle("Close sidebar")).toBeInTheDocument();
  });

  it("calls closeSidebar when close button clicked", () => {
    useAIStore.setState({ isSidebarOpen: true });
    render(<AISidebar />);
    fireEvent.click(screen.getByTitle("Close sidebar"));
    expect(useAIStore.getState().isSidebarOpen).toBe(false);
  });

  it("renders selected text preview", () => {
    useAIStore.setState({
      isSidebarOpen: true,
      selectedText: "Important text from the document",
    });
    render(<AISidebar />);
    expect(screen.getByText("Selected text")).toBeInTheDocument();
    expect(
      screen.getByText(/Important text from the document/)
    ).toBeInTheDocument();
  });

  it("does not render selected text preview when no text selected", () => {
    useAIStore.setState({ isSidebarOpen: true, selectedText: null });
    render(<AISidebar />);
    expect(screen.queryByText("Selected text")).not.toBeInTheDocument();
  });
});
