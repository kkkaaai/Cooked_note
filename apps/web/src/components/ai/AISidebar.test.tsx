import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AISidebar } from "./AISidebar";
import { useAIStore } from "@cookednote/shared/stores/ai-store";
import type { Screenshot } from "@cookednote/shared/types";

function makeScreenshot(overrides: Partial<Screenshot> = {}): Screenshot {
  return {
    id: overrides.id ?? "ss-1",
    base64: overrides.base64 ?? "data:image/png;base64,abc",
    pageNumber: overrides.pageNumber ?? 1,
    region: overrides.region ?? { x: 0.1, y: 0.1, width: 0.5, height: 0.3 },
    createdAt: overrides.createdAt ?? Date.now(),
  };
}

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

  it("renders screenshot thumbnails when screenshots are pending", () => {
    useAIStore.setState({
      isSidebarOpen: true,
      pendingScreenshots: [
        makeScreenshot({ id: "ss-1", pageNumber: 3 }),
        makeScreenshot({ id: "ss-2", pageNumber: 5 }),
      ],
    });
    render(<AISidebar />);
    expect(screen.getByText("Attached screenshots (2/5)")).toBeInTheDocument();
    expect(screen.getByAltText("Page 3 capture")).toBeInTheDocument();
    expect(screen.getByAltText("Page 5 capture")).toBeInTheDocument();
  });

  it("does not render screenshots section when no screenshots", () => {
    useAIStore.setState({ isSidebarOpen: true, pendingScreenshots: [] });
    render(<AISidebar />);
    expect(screen.queryByText(/Attached screenshots/)).not.toBeInTheDocument();
  });

  it("removes screenshot when remove button clicked", () => {
    useAIStore.setState({
      isSidebarOpen: true,
      pendingScreenshots: [makeScreenshot({ id: "ss-1" })],
    });
    render(<AISidebar />);
    fireEvent.click(screen.getByTitle("Remove screenshot"));
    expect(useAIStore.getState().pendingScreenshots).toEqual([]);
  });
});
