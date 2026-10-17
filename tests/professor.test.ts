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

test("dense areas: only spots marked by enough different students become areas, each with its own reasons", async () => {
  const { findDenseAreas } = await import("../src/features/professor/denseAreas");
  const box = (studentId: string, x: number, y: number, w: number, h: number, categories: any[]) =>
    ({ id: Math.random().toString(), sessionId: "s", slideNumber: 1, studentId, kind: "region" as const, rect: { x, y, width: w, height: h }, categories, createdAt: "" });
  const signals = [
    box("ana", .05, .30, .40, .20, ["Need an example"]),            // area A (top-left): ana + ben + cam
    box("ben", .20, .35, .40, .20, ["Need an example", "Other"]),
    box("cam", .25, .38, .10, .10, ["Why does this work?"]),
    box("dan", .55, .75, .30, .15, ["I don’t understand"]),         // area B (bottom-right): dan + eve
    box("eve", .60, .78, .30, .15, ["I don’t understand"]),
    box("fay", .85, .05, .10, .10, ["Other"]),                      // alone: never an area at threshold 2
  ];
  const areas = findDenseAreas(signals, 2);
  assert.equal(areas.length, 2);
  assert.equal(areas[0].peak, 3);                                     // busiest area first
  assert.equal(areas[0].students, 3);
  assert.equal(areas[0].reasons["Need an example"], 2);
  assert.equal(areas[1].students, 2);
  assert.equal(areas[1].reasons["I don’t understand"], 2);
  assert.ok(areas[1].bounds.x >= .55 && areas[1].bounds.y >= .75);   // located where the overlap is
  assert.equal(findDenseAreas(signals, 3).length, 1);
  assert.equal(findDenseAreas(signals, 1).length, 3);                 // threshold 1: every marked region
  // one student drawing two overlapping boxes is still one student
  assert.equal(findDenseAreas([box("ana", .1, .1, .3, .3, ["Other"]), box("ana", .2, .2, .3, .3, ["Other"])], 2).length, 0);
});

test("Other answers: only typed reasons from boxes that picked Other, oldest first, also per dense area", async () => {
  const { otherAnswers } = await import("../src/features/professor/stats");
  const { findDenseAreas } = await import("../src/features/professor/denseAreas");
  const box = (studentId: string, createdAt: string, categories: any[], otherText?: string) =>
    ({ id: studentId + createdAt, sessionId: "s", slideNumber: 1, studentId, kind: "region" as const,
       rect: { x: .2, y: .2, width: .3, height: .3 }, categories, otherText, createdAt });
  const signals = [
    box("ben", "2026-10-17T10:02:00Z", ["Other"], "what does * mean here?"),
    box("ana", "2026-10-17T10:01:00Z", ["Need an example", "Other"], "too fast"),
    box("cam", "2026-10-17T10:03:00Z", ["Need an example"]),
  ];
  assert.deepEqual(otherAnswers(signals), ["too fast", "what does * mean here?"]);
  assert.deepEqual(findDenseAreas(signals, 2)[0].otherAnswers, ["too fast", "what does * mean here?"]);
});
