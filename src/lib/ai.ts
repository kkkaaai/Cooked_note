import Anthropic from "@anthropic-ai/sdk";

export function getAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

/**
 * Parse extracted text (from AIContext) into a map of page number -> page text.
 * The extracted text uses "--- Page X ---" markers created by extractTextFromPDF().
 */
export function parsePageText(extractedText: string): Map<number, string> {
  const pages = new Map<number, string>();
  const pageRegex = /--- Page (\d+) ---/g;
  const markers: { page: number; index: number }[] = [];

  let match: RegExpExecArray | null;
  while ((match = pageRegex.exec(extractedText)) !== null) {
    markers.push({ page: parseInt(match[1], 10), index: match.index });
  }

  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index + `--- Page ${markers[i].page} ---`.length;
    const end = i + 1 < markers.length ? markers[i + 1].index : extractedText.length;
    const text = extractedText.slice(start, end).trim();
    pages.set(markers[i].page, text);
  }

  return pages;
}

/**
 * Get relevant context around a selected page, staying within maxChars.
 * Prioritizes the target page, then expands to adjacent pages.
 */
export function getRelevantContext(
  extractedText: string,
  pageNumber: number,
  maxChars: number = 8000
): string {
  const pages = parsePageText(extractedText);
  if (pages.size === 0) return extractedText.substring(0, maxChars);

  const result: { page: number; text: string }[] = [];
  let charCount = 0;

  // Always include the target page first
  const targetText = pages.get(pageNumber) ?? "";
  if (targetText) {
    const entry = `--- Page ${pageNumber} ---\n${targetText}`;
    result.push({ page: pageNumber, text: entry });
    charCount += entry.length;
  }

  // Expand outward: page-1, page+1, page-2, page+2, ...
  const maxPage = Math.max(...Array.from(pages.keys()));
  for (let offset = 1; offset <= maxPage; offset++) {
    for (const delta of [-offset, offset]) {
      const p = pageNumber + delta;
      if (p < 1 || !pages.has(p) || p === pageNumber) continue;

      const text = pages.get(p)!;
      const entry = `--- Page ${p} ---\n${text}`;
      if (charCount + entry.length > maxChars) continue;

      result.push({ page: p, text: entry });
      charCount += entry.length;
    }
  }

  // Sort by page number for coherent reading
  result.sort((a, b) => a.page - b.page);
  return result.map((r) => r.text).join("\n\n");
}

export function buildExplainSystemPrompt(context: string, pageCount: number): string {
  return `You are a helpful AI assistant that explains text from PDF documents. The document has ${pageCount} pages.

Your role:
- Provide clear, concise explanations of the selected text
- Use the document context to give accurate, well-informed answers
- If the text contains technical terms, explain them simply
- Keep explanations focused and educational

Document context:
${context}`;
}

export function buildChatSystemPrompt(
  context: string,
  pageCount: number,
  selectedText: string
): string {
  return `You are a helpful AI assistant discussing a PDF document with the user. The document has ${pageCount} pages.

The user originally selected this text for explanation:
"${selectedText}"

Your role:
- Answer follow-up questions about the selected text and the document
- Use the document context to provide accurate answers
- Be concise but thorough
- If you're unsure about something, say so

Document context:
${context}`;
}
