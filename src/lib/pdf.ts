// pdfjs-dist is externalized via serverComponentsExternalPackages in next.config.mjs
// so it runs as a native Node.js module. We use PDFWorker({ port: null }) to disable
// worker threads and run everything in the main thread (server-side only).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pdfjs: any = null;

async function getPdfjs() {
  if (!_pdfjs) {
    _pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return _pdfjs;
}

function getDocumentOptions(data: ArrayBuffer, worker: unknown) {
  return {
    data,
    worker,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  };
}

export async function extractTextFromPDF(
  fileBuffer: ArrayBuffer
): Promise<string> {
  const pdfjs = await getPdfjs();
  const worker = new pdfjs.PDFWorker({ port: null });
  try {
    const pdf = await pdfjs.getDocument(getDocumentOptions(fileBuffer, worker)).promise;
    const pages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .filter((item: Record<string, unknown>) => "str" in item)
        .map((item: Record<string, unknown>) => item.str as string)
        .join(" ");
      pages.push(`--- Page ${i} ---\n${pageText}`);
    }

    return pages.join("\n\n");
  } finally {
    worker.destroy();
  }
}

export async function getPageCount(
  fileBuffer: ArrayBuffer
): Promise<number> {
  const pdfjs = await getPdfjs();
  const worker = new pdfjs.PDFWorker({ port: null });
  try {
    const pdf = await pdfjs.getDocument(getDocumentOptions(fileBuffer, worker)).promise;
    return pdf.numPages;
  } finally {
    worker.destroy();
  }
}
