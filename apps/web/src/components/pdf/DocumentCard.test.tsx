import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentCard } from "./DocumentCard";
import type { DocumentMeta } from "@cookednote/shared/types";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockDocument: DocumentMeta = {
  id: "doc-123",
  title: "Test Document",
  fileName: "test-document.pdf",
  fileUrl: "https://example.com/test.pdf",
  fileSize: 2_500_000,
  pageCount: 15,
  uploadedAt: "2026-01-15T00:00:00.000Z",
  lastOpenedAt: "2026-01-20T00:00:00.000Z",
  folderId: null,
};

describe("DocumentCard", () => {
  const onDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders document info", () => {
    render(<DocumentCard document={mockDocument} onDelete={onDelete} />);

    expect(screen.getByText("Test Document")).toBeInTheDocument();
    expect(screen.getByText("15 pages")).toBeInTheDocument();
    expect(screen.getByText("2.4 MB")).toBeInTheDocument();
  });

  it("navigates on card click", async () => {
    const user = userEvent.setup();
    render(<DocumentCard document={mockDocument} onDelete={onDelete} />);

    // Click the card itself (the outermost clickable element)
    await user.click(screen.getByText("Test Document"));
    expect(mockPush).toHaveBeenCalledWith("/document/doc-123");
  });
});
