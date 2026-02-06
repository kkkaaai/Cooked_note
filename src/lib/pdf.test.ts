import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the dynamic import of pdfjs-dist legacy build
const mockGetDocument = vi.fn();
const mockWorkerDestroy = vi.fn();

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  getDocument: mockGetDocument,
  GlobalWorkerOptions: { workerSrc: "" },
  PDFWorker: class { destroy = mockWorkerDestroy; },
}));

import { extractTextFromPDF, getPageCount } from "./pdf";

function createMockPDF(pages: string[][]) {
  return {
    promise: Promise.resolve({
      numPages: pages.length,
      getPage: vi.fn((pageNum: number) =>
        Promise.resolve({
          getTextContent: vi.fn(() =>
            Promise.resolve({
              items: pages[pageNum - 1].map((str) => ({ str })),
            })
          ),
        })
      ),
    }),
  };
}

describe("extractTextFromPDF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts text from all pages", async () => {
    mockGetDocument.mockReturnValue(createMockPDF([["Hello", "World"], ["Page", "Two"]]));

    const result = await extractTextFromPDF(new ArrayBuffer(0));

    expect(result).toContain("--- Page 1 ---");
    expect(result).toContain("Hello World");
    expect(result).toContain("--- Page 2 ---");
    expect(result).toContain("Page Two");
  });

  it("handles empty PDF", async () => {
    mockGetDocument.mockReturnValue(createMockPDF([]));

    const result = await extractTextFromPDF(new ArrayBuffer(0));
    expect(result).toBe("");
  });

  it("cleans up worker after extraction", async () => {
    mockGetDocument.mockReturnValue(createMockPDF([["text"]]));

    await extractTextFromPDF(new ArrayBuffer(0));
    expect(mockWorkerDestroy).toHaveBeenCalled();
  });
});

describe("getPageCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns correct page count", async () => {
    mockGetDocument.mockReturnValue(createMockPDF([["Page 1"], ["Page 2"], ["Page 3"]]));

    const count = await getPageCount(new ArrayBuffer(0));
    expect(count).toBe(3);
  });

  it("cleans up worker after counting", async () => {
    mockGetDocument.mockReturnValue(createMockPDF([["text"]]));

    await getPageCount(new ArrayBuffer(0));
    expect(mockWorkerDestroy).toHaveBeenCalled();
  });
});
