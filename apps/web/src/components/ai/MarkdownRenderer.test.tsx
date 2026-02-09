import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownRenderer } from "./MarkdownRenderer";

describe("MarkdownRenderer", () => {
  it("renders plain text", () => {
    render(<MarkdownRenderer content="Hello world" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders bold text", () => {
    render(<MarkdownRenderer content="This is **bold** text" />);
    expect(screen.getByText("bold")).toHaveClass("font-semibold");
  });

  it("renders inline code", () => {
    render(<MarkdownRenderer content="Use `console.log()` for debugging" />);
    const code = screen.getByText("console.log()");
    expect(code.tagName).toBe("CODE");
  });

  it("renders unordered lists", () => {
    render(<MarkdownRenderer content={"- Item 1\n- Item 2\n- Item 3"} />);
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
    expect(screen.getByText("Item 3")).toBeInTheDocument();
  });

  it("renders headers", () => {
    render(<MarkdownRenderer content="## Section Title" />);
    const header = screen.getByText("Section Title");
    expect(header.tagName).toBe("H2");
  });

  it("renders inline math with KaTeX", () => {
    const { container } = render(
      <MarkdownRenderer content="The formula is $x^2 + y^2 = z^2$" />
    );
    // KaTeX renders math inside .katex elements
    const katexElements = container.querySelectorAll(".katex");
    expect(katexElements.length).toBeGreaterThan(0);
  });

  it("renders block math with KaTeX", () => {
    const { container } = render(
      <MarkdownRenderer content={"$$\n\\frac{1}{2}\n$$"} />
    );
    const katexDisplay = container.querySelectorAll(".katex-display");
    expect(katexDisplay.length).toBeGreaterThan(0);
  });

  it("renders blockquotes", () => {
    render(<MarkdownRenderer content="> This is a quote" />);
    const blockquote = screen.getByText("This is a quote");
    expect(blockquote.closest("blockquote")).toBeInTheDocument();
  });

  it("renders ordered lists", () => {
    render(
      <MarkdownRenderer content={"1. First\n2. Second\n3. Third"} />
    );
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("renders mixed content with math and text", () => {
    const { container } = render(
      <MarkdownRenderer content={"The equation $E = mc^2$ is famous.\n\nIt means:\n$$E = mc^2$$"} />
    );
    const katexElements = container.querySelectorAll(".katex");
    expect(katexElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/is famous/)).toBeInTheDocument();
  });
});
