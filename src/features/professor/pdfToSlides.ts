// Turns a PDF into one PNG image + the page's text per slide. Browser only (uses <canvas>).
// The pdf.js worker is served from public/pdf.worker.min.mjs. If pdfjs-dist is ever upgraded, copy the new one:
//   cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/
export type SlideInput = { image: Blob; text: string };

export const MAX_PAGES = 20;
const MAX_WIDTH_PX = 2000;

export async function pdfToSlides(file: File, onProgress?: (page: number, total: number) => void): Promise<SlideInput[]> {
  const pdfjs = await import("pdfjs-dist"); // loaded here, not at the top, so it never runs on the server
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const loading = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  let pdf;
  try {
    pdf = await loading.promise;
  } catch {
    throw new Error("Couldn't read that file. Is it a PDF?");
  }
  if (pdf.numPages > MAX_PAGES) {
    await loading.destroy();
    throw new Error(`That PDF has ${pdf.numPages} pages. The limit is ${MAX_PAGES}.`);
  }

  const slides: SlideInput[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
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
  await loading.destroy(); // frees the worker
  return slides;
}
