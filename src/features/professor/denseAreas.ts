// Finds the "dense areas" of a slide: places where at least `threshold` different students marked the same spot.
// How: lay a fine grid over the slide, count how many students' marks cover each cell, keep the cells at or above
// the threshold, and group touching cells into areas. Each area gets its own reason breakdown.
import { categories, type Category, type Rect } from "@/lib/domain";
import type { Signal } from "@/lib/types";
import { otherAnswers } from "./stats";

export type DenseArea = {
  bounds: Rect;                         // smallest box around the area, 0..1
  students: number;                     // different students who marked inside the area
  peak: number;                         // most students overlapping on a single spot in the area
  reasons: Record<Category, number>;    // students per reason (each student counts once per reason)
  otherAnswers: string[];               // typed "Other" reasons from marks in this area
};

const COLS = 80;
const ROWS = 60;

// Does this student's mark cover the point? Boxes today; highlighter strokes plug in here later.
export function covers(signal: Signal, x: number, y: number): boolean {
  const r = signal.rect;
  return signal.kind === "region" && !!r && x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
}

export function findDenseAreas(signals: Signal[], threshold: number): DenseArea[] {
  const marks = signals.filter(s => s.kind === "region");
  if (!marks.length) return [];

  // For every cell: which marks cover its center, and how many different students that is.
  const cellMarks: Signal[][] = [];
  const cellStudents: number[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const here = marks.filter(s => covers(s, (col + 0.5) / COLS, (row + 0.5) / ROWS));
      cellMarks.push(here);
      cellStudents.push(new Set(here.map(s => s.studentId)).size);
    }
  }

  // Group touching hot cells (up/down/left/right) into areas.
  const hot = (i: number) => cellStudents[i] >= threshold;
  const visited = new Uint8Array(COLS * ROWS);
  const areas: DenseArea[] = [];
  for (let start = 0; start < COLS * ROWS; start++) {
    if (!hot(start) || visited[start]) continue;
    const queue = [start];
    visited[start] = 1;
    const inArea = new Map<string, Signal>();
    let minC = COLS, maxC = 0, minR = ROWS, maxR = 0, peak = 0;
    while (queue.length) {
      const i = queue.pop()!;
      const col = i % COLS, row = Math.floor(i / COLS);
      minC = Math.min(minC, col); maxC = Math.max(maxC, col);
      minR = Math.min(minR, row); maxR = Math.max(maxR, row);
      peak = Math.max(peak, cellStudents[i]);
      for (const s of cellMarks[i]) inArea.set(s.id, s);
      const neighbours = [col > 0 ? i - 1 : -1, col < COLS - 1 ? i + 1 : -1, row > 0 ? i - COLS : -1, row < ROWS - 1 ? i + COLS : -1];
      for (const n of neighbours) if (n >= 0 && !visited[n] && hot(n)) { visited[n] = 1; queue.push(n); }
    }
    const list = [...inArea.values()];
    const reasons = Object.fromEntries(categories.map(c =>
      [c, new Set(list.filter(s => s.categories.includes(c)).map(s => s.studentId)).size])) as Record<Category, number>;
    areas.push({
      bounds: { x: minC / COLS, y: minR / ROWS, width: (maxC - minC + 1) / COLS, height: (maxR - minR + 1) / ROWS },
      students: new Set(list.map(s => s.studentId)).size,
      peak,
      reasons,
      otherAnswers: otherAnswers(list),
    });
  }
  return areas.sort((a, b) => b.peak - a.peak || b.students - a.students);
}
