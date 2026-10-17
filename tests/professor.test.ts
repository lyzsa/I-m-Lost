import { test } from "node:test";
import assert from "node:assert/strict";
import { nextLiveStep } from "../src/features/professor/liveStep";

const slides = [1, 2, 3].map(number => ({ number, imageUrl: "", text: "" }));

test("main button: Review keeps the slide, Next moves on, last slide ends the class", () => {
  assert.deepEqual(nextLiveStep({ slides, currentSlide: 1, phase: "presenting" }), { label: "Review slide 1", slide: 1, phase: "reviewing" });
  assert.deepEqual(nextLiveStep({ slides, currentSlide: 1, phase: "reviewing" }), { label: "Next slide", slide: 2, phase: "presenting" });
  assert.deepEqual(nextLiveStep({ slides, currentSlide: 3, phase: "presenting" }), { label: "Review slide 3", slide: 3, phase: "reviewing" });
  assert.deepEqual(nextLiveStep({ slides, currentSlide: 3, phase: "reviewing" }), { label: "End class", slide: 3, phase: "ended" });
  assert.equal(nextLiveStep({ slides, currentSlide: 3, phase: "ended" }), null);
});

test("stats: Lost taps and boxes are separate; students are counted once; a box counts in every category it picked", async () => {
  const { slideStats } = await import("../src/features/professor/stats");
  const base = { sessionId: "s", slideNumber: 1, createdAt: "" };
  const s = slideStats([
    { ...base, id: "1", studentId: "ana", kind: "lost", categories: [] },
    { ...base, id: "2", studentId: "ana", kind: "region", rect: { x: 0, y: 0, width: .5, height: .5 }, categories: ["Need an example", "Other"] },
    { ...base, id: "3", studentId: "ben", kind: "region", rect: { x: .2, y: .2, width: .5, height: .5 }, categories: ["Other"] },
  ]);
  assert.deepEqual([s.lost, s.boxes, s.students, s.categories.Other, s.categories["Need an example"]], [1, 2, 2, 2, 1]);
});

test("heatmap list: merging live and loaded signals never duplicates a box", async () => {
  const { mergeSignals } = await import("../src/features/professor/useSlideSignals");
  const sig = (id: string) => ({ id, sessionId: "s", slideNumber: 1, studentId: "x", kind: "lost" as const, categories: [], createdAt: "" });
  assert.deepEqual(mergeSignals([sig("a"), sig("b")], [sig("b"), sig("c")]).map(s => s.id), ["a", "b", "c"]);
});
