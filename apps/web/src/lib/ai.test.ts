import { describe, it, expect } from "vitest";
import {
  parsePageText,
  getRelevantContext,
  buildExplainSystemPrompt,
  buildChatSystemPrompt,
  buildVisionSystemPrompt,
  getRelevantContextForPages,
} from "./ai";

describe("parsePageText", () => {
  it("parses single page text", () => {
    const text = "--- Page 1 ---\nHello world";
    const pages = parsePageText(text);
    expect(pages.size).toBe(1);
    expect(pages.get(1)).toBe("Hello world");
  });

  it("parses multi-page text", () => {
    const text =
      "--- Page 1 ---\nFirst page\n\n--- Page 2 ---\nSecond page\n\n--- Page 3 ---\nThird page";
    const pages = parsePageText(text);
    expect(pages.size).toBe(3);
    expect(pages.get(1)).toBe("First page");
    expect(pages.get(2)).toBe("Second page");
    expect(pages.get(3)).toBe("Third page");
  });

  it("handles empty text", () => {
    const pages = parsePageText("");
    expect(pages.size).toBe(0);
  });

  it("handles text without page markers", () => {
    const pages = parsePageText("just some text without markers");
    expect(pages.size).toBe(0);
  });

  it("trims whitespace from page text", () => {
    const text = "--- Page 1 ---\n  Hello  \n\n";
    const pages = parsePageText(text);
    expect(pages.get(1)).toBe("Hello");
  });
});

describe("getRelevantContext", () => {
  const threePages =
    "--- Page 1 ---\nFirst page content\n\n--- Page 2 ---\nSecond page content\n\n--- Page 3 ---\nThird page content";

  it("includes target page text", () => {
    const context = getRelevantContext(threePages, 2);
    expect(context).toContain("--- Page 2 ---");
    expect(context).toContain("Second page content");
  });

  it("includes surrounding pages", () => {
    const context = getRelevantContext(threePages, 2, 10000);
    expect(context).toContain("--- Page 1 ---");
    expect(context).toContain("--- Page 3 ---");
  });

  it("sorts pages in order", () => {
    const context = getRelevantContext(threePages, 2, 10000);
    const page1Index = context.indexOf("--- Page 1 ---");
    const page2Index = context.indexOf("--- Page 2 ---");
    const page3Index = context.indexOf("--- Page 3 ---");
    expect(page1Index).toBeLessThan(page2Index);
    expect(page2Index).toBeLessThan(page3Index);
  });

  it("respects maxChars limit", () => {
    const context = getRelevantContext(threePages, 2, 50);
    // Should at least contain the target page
    expect(context).toContain("--- Page 2 ---");
    expect(context.length).toBeLessThanOrEqual(100); // some leeway for the target page itself
  });

  it("handles single-page document", () => {
    const singlePage = "--- Page 1 ---\nOnly page";
    const context = getRelevantContext(singlePage, 1);
    expect(context).toContain("Only page");
  });

  it("handles page number beyond document length", () => {
    const context = getRelevantContext(threePages, 99);
    // Should return what it can — no target page found, but tries surrounding
    expect(typeof context).toBe("string");
  });

  it("falls back to substring for text without markers", () => {
    const plain = "Just plain text without any page markers at all";
    const context = getRelevantContext(plain, 1, 20);
    expect(context).toBe("Just plain text with");
  });
});

describe("buildExplainSystemPrompt", () => {
  it("includes page count", () => {
    const prompt = buildExplainSystemPrompt("some context", 10);
    expect(prompt).toContain("10 pages");
  });

  it("includes document context", () => {
    const prompt = buildExplainSystemPrompt("my document text", 5);
    expect(prompt).toContain("my document text");
  });
});

describe("buildChatSystemPrompt", () => {
  it("includes page count", () => {
    const prompt = buildChatSystemPrompt("context", 5, "selected");
    expect(prompt).toContain("5 pages");
  });

  it("includes selected text", () => {
    const prompt = buildChatSystemPrompt("context", 5, "important phrase");
    expect(prompt).toContain("important phrase");
  });

  it("includes document context", () => {
    const prompt = buildChatSystemPrompt("my doc context", 5, "selected");
    expect(prompt).toContain("my doc context");
  });
});

describe("buildVisionSystemPrompt", () => {
  it("includes page count", () => {
    const prompt = buildVisionSystemPrompt("context", 10);
    expect(prompt).toContain("10 pages");
  });

  it("includes document context", () => {
    const prompt = buildVisionSystemPrompt("my context", 5);
    expect(prompt).toContain("my context");
  });

  it("mentions screenshots", () => {
    const prompt = buildVisionSystemPrompt("context", 5);
    expect(prompt).toContain("screenshot");
  });
});

describe("getRelevantContextForPages", () => {
  const threePages =
    "--- Page 1 ---\nFirst page\n\n--- Page 2 ---\nSecond page\n\n--- Page 3 ---\nThird page";

  it("includes all referenced pages", () => {
    const context = getRelevantContextForPages(threePages, [1, 3], 10000);
    expect(context).toContain("--- Page 1 ---");
    expect(context).toContain("--- Page 3 ---");
  });

  it("sorts pages in order", () => {
    const context = getRelevantContextForPages(threePages, [3, 1], 10000);
    const page1Idx = context.indexOf("--- Page 1 ---");
    const page3Idx = context.indexOf("--- Page 3 ---");
    expect(page1Idx).toBeLessThan(page3Idx);
  });

  it("deduplicates page numbers", () => {
    const context = getRelevantContextForPages(threePages, [2, 2, 2], 10000);
    const matches = context.match(/--- Page 2 ---/g);
    expect(matches).toHaveLength(1);
  });

  it("falls back to page 1 context when no pages provided", () => {
    const context = getRelevantContextForPages(threePages, [], 10000);
    expect(context).toContain("--- Page 1 ---");
  });

  it("expands around first referenced page with remaining budget", () => {
    const context = getRelevantContextForPages(threePages, [2], 10000);
    expect(context).toContain("--- Page 1 ---");
    expect(context).toContain("--- Page 3 ---");
  });
});
