// The pdf.js background worker, with the Safari fix loaded first.
// The worker is pdf.js's "legacy" build, which also fills in other very new JavaScript features
// (Map.getOrInsertComputed, Math.sumPrecise, ...) that Safari and older browsers lack.
// If pdfjs-dist is upgraded: cp node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs public/pdfjs/pdf.worker.legacy.min.mjs
import "./readable-stream-iterator.mjs";
import "./pdf.worker.legacy.min.mjs";
