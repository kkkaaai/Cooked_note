import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SelectionPopup } from "./SelectionPopup";
import { HIGHLIGHT_COLORS } from "@/types";

describe("SelectionPopup", () => {
  const defaultProps = {
    position: { x: 200, y: 300 },
    onHighlight: vi.fn(),
    onDismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all highlight color buttons", () => {
    render(<SelectionPopup {...defaultProps} />);
    HIGHLIGHT_COLORS.forEach((color) => {
      expect(
        screen.getByTitle(`Highlight ${color.name}`)
      ).toBeInTheDocument();
    });
  });

  it("renders 5 color buttons", () => {
    render(<SelectionPopup {...defaultProps} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(5);
  });

  it("calls onHighlight with correct color when clicked", () => {
    render(<SelectionPopup {...defaultProps} />);
    const yellowBtn = screen.getByTitle("Highlight Yellow");
    fireEvent.click(yellowBtn);
    expect(defaultProps.onHighlight).toHaveBeenCalledWith(HIGHLIGHT_COLORS[0]);
  });

  it("calls onHighlight with green color", () => {
    render(<SelectionPopup {...defaultProps} />);
    const greenBtn = screen.getByTitle("Highlight Green");
    fireEvent.click(greenBtn);
    expect(defaultProps.onHighlight).toHaveBeenCalledWith(HIGHLIGHT_COLORS[1]);
  });

  it("renders with correct position", () => {
    const { container } = render(<SelectionPopup {...defaultProps} />);
    const popup = container.firstElementChild as HTMLElement;
    expect(popup.style.top).toBe("308px"); // 300 + 8
  });

  it("has toolbar role for accessibility", () => {
    render(<SelectionPopup {...defaultProps} />);
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
  });

  it("has aria-labels on color buttons", () => {
    render(<SelectionPopup {...defaultProps} />);
    HIGHLIGHT_COLORS.forEach((color) => {
      expect(
        screen.getByLabelText(`Highlight ${color.name}`)
      ).toBeInTheDocument();
    });
  });
});
