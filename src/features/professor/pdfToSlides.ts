// Turns a PDF into one PNG image + the page's text per slide. Browser only (uses <canvas>).
// The pdf.js worker is served from public/pdf.worker.min.mjs. If pdfjs-dist is ever upgraded, copy the new one:
//   cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/
export type SlideInput = { image: Blob; text: string };

export const MAX_PAGES = 20;
const MAX_WIDTH_PX = 2000;
export const CANCELLED = "Upload cancelled";

async function openPdf(file: File) {
  const pdfjs = await import("pdfjs-dist"); // loaded here, not at the top, so it never runs on the server
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const loading = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    return { loading, pdf: await loading.promise };
  } catch {
    throw new Error("Couldn't read that file. Is it a PDF?");
  }
}

// Quick check right after a file is chosen: how many pages (throws if it isn't a readable PDF).
export async function countPdfPages(file: File): Promise<number> {
  const { loading, pdf } = await openPdf(file);
  const pages = pdf.numPages;
  await loading.destroy();
  return pages;
}

// `cancel` lets the page stop the conversion between pages (it then throws CANCELLED).
export async function pdfToSlides(
  file: File,
  onProgress?: (page: number, total: number) => void,
  cancel?: AbortSignal,
): Promise<SlideInput[]> {
  const { loading, pdf } = await openPdf(file);
  try {
    if (pdf.numPages > MAX_PAGES) throw new Error(`That PDF has ${pdf.numPages} pages. The limit is ${MAX_PAGES}.`);
    const slides: SlideInput[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      if (cancel?.aborted) throw new Error(CANCELLED);
      onProgress?.(n, pdf.numPages);
      const page = await pdf.getPage(n);
      const scale = Math.min(2, MAX_WIDTH_PX / page.getViewport({ scale: 1 }).width);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;
      const image = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error(`Couldn't convert page ${n}`))), "image/png"));
      const content = await page.getTextContent();
      const text = content.items.map(item => ("str" in item ? item.str : "")).join(" ").replace(/\s+/g, " ").trim();
      slides.push({ image, text });
      page.cleanup();
    }
    if (cancel?.aborted) throw new Error(CANCELLED);
    return slides;
  } finally {
    await loading.destroy(); // frees the worker
  }
}
