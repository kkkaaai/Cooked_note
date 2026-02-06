import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UploadDialog } from "./UploadDialog";

// Mock use-toast
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe("UploadDialog", () => {
  const onUploadComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders trigger button", () => {
    render(<UploadDialog onUploadComplete={onUploadComplete} />);
    expect(screen.getByRole("button", { name: /upload pdf/i })).toBeInTheDocument();
  });

  it("opens dialog on trigger click", async () => {
    const user = userEvent.setup();
    render(<UploadDialog onUploadComplete={onUploadComplete} />);

    await user.click(screen.getByRole("button", { name: /upload pdf/i }));

    // Dialog content should appear
    expect(
      screen.getByText("Select a PDF file to upload. Maximum file size is 50MB.")
    ).toBeInTheDocument();
  });

  it("shows validation error for non-PDF files", async () => {
    const user = userEvent.setup();
    render(<UploadDialog onUploadComplete={onUploadComplete} />);

    // Open dialog
    await user.click(screen.getByRole("button", { name: /upload pdf/i }));

    // Use fireEvent.change to bypass accept attribute filtering
    const file = new File(["content"], "test.txt", { type: "text/plain" });
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input);

    expect(screen.getByText("Only PDF files are allowed")).toBeInTheDocument();
  });

  it("shows selected PDF file name", async () => {
    const user = userEvent.setup();
    render(<UploadDialog onUploadComplete={onUploadComplete} />);

    // Open dialog
    await user.click(screen.getByRole("button", { name: /upload pdf/i }));

    const file = new File(["content"], "document.pdf", {
      type: "application/pdf",
    });
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    await user.upload(input, file);

    expect(screen.getByText("document.pdf")).toBeInTheDocument();
  });
});
