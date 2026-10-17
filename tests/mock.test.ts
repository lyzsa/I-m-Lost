import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Minimal stand-ins for the browser storage the mock uses.
class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
  clear() { this.data.clear(); }
}
const local = new MemoryStorage();
const session = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", { value: local, configurable: true });
Object.defineProperty(globalThis, "sessionStorage", { value: session, configurable: true });
Object.defineProperty(globalThis, "window", { value: { addEventListener() {} }, configurable: true });

let mock: typeof import("../src/lib/backend/mock");
before(async () => { mock = await import("../src/lib/backend/mock"); });
const tick = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => { local.clear(); session.clear(); });

test("join: DEMO01 works, any case; wrong code has a clear error; members are counted", async () => {
  const s = await mock.joinSession("demo01", "Ana");
  assert.equal(s.code, "DEMO01");
  assert.equal(s.slides.length, 3);
  await assert.rejects(mock.joinSession("XXXXXX", "Ana"), /No class with that code/);
  assert.equal(await mock.countStudents(s.id), 1);
});

test("ended class can't be joined", async () => {
  await mock.updateLive(mock.DEMO_SESSION_ID, 3, "ended");
  await assert.rejects(mock.joinSession("DEMO01", "Ana"), /This class has ended/);
});

test("updateLive notifies subscribers; unsubscribe stops it", async () => {
  const seen: number[] = [];
  const stop = mock.subscribeToSession(mock.DEMO_SESSION_ID, s => seen.push(s.currentSlide));
  await mock.updateLive(mock.DEMO_SESSION_ID, 2, "presenting");
  await tick();
  stop();
  await mock.updateLive(mock.DEMO_SESSION_ID, 3, "presenting");
  await tick();
  assert.deepEqual(seen, [2]);
});

test("I'm Lost: once per student per slide; retrying the same id doesn't double count", async () => {
  const base = { sessionId: mock.DEMO_SESSION_ID, slideNumber: 1, kind: "lost" as const, categories: [] };
  const id = crypto.randomUUID();
  await mock.submitSignal({ ...base, id });
  await mock.submitSignal({ ...base, id }); // retry
  assert.equal((await mock.getSlideSignals(mock.DEMO_SESSION_ID, 1)).length, 1);
  await assert.rejects(mock.submitSignal({ ...base, id: crypto.randomUUID() }), /already tapped/);
});

test("region signals are validated and reach subscribeToSignals", async () => {
  const got: string[] = [];
  const stop = mock.subscribeToSignals(mock.DEMO_SESSION_ID, s => got.push(s.id));
  const id = crypto.randomUUID();
  await mock.submitSignal({ id, sessionId: mock.DEMO_SESSION_ID, slideNumber: 2, kind: "region",
    rect: { x: .1, y: .1, width: .3, height: .2 }, categories: ["Need an example", "Other"], otherText: "what is &x?" });
  await tick();
  stop();
  assert.deepEqual(got, [id]);
  await assert.rejects(mock.submitSignal({ id: crypto.randomUUID(), sessionId: mock.DEMO_SESSION_ID, slideNumber: 2,
    kind: "region", rect: { x: .9, y: .1, width: .3, height: .2 }, categories: ["Other"] }), /outside the slide/);
  await assert.rejects(mock.submitSignal({ id: crypto.randomUUID(), sessionId: mock.DEMO_SESSION_ID, slideNumber: 2,
    kind: "region", rect: { x: .1, y: .1, width: .3, height: .2 }, categories: [] }), /at least one category/);
});

test("Other needs the student's own words (1-200 chars); they're trimmed and saved", async () => {
  const box = { sessionId: mock.DEMO_SESSION_ID, slideNumber: 1, kind: "region" as const, rect: { x: .1, y: .1, width: .3, height: .2 } };
  const submit = (extra: { categories: ("Other" | "Need an example")[]; otherText?: string }) =>
    mock.submitSignal({ ...box, id: crypto.randomUUID(), ...extra });
  await assert.rejects(submit({ categories: ["Other"] }), /what's confusing/);
  await assert.rejects(submit({ categories: ["Other"], otherText: "   " }), /what's confusing/);
  await assert.rejects(submit({ categories: ["Other"], otherText: "x".repeat(201) }), /under 200/);
  await assert.rejects(submit({ categories: ["Need an example"], otherText: "hi" }), /when you pick Other/);
  await assert.rejects(mock.submitSignal({ id: crypto.randomUUID(), sessionId: mock.DEMO_SESSION_ID, slideNumber: 1,
    kind: "lost", categories: [], otherText: "hi" }), /no box or categories/);
  const saved = await submit({ categories: ["Other"], otherText: "  why is it &x?  " });
  assert.equal(saved.otherText, "why is it &x?");
  assert.equal((await mock.getMySignals(mock.DEMO_SESSION_ID))[0].otherText, "why is it &x?");
});

test("students only see their own signals; explanation is saved on the signal", async () => {
  const id = crypto.randomUUID();
  await mock.submitSignal({ id, sessionId: mock.DEMO_SESSION_ID, slideNumber: 1, kind: "lost", categories: [] });
  session.clear(); // a different tab = a different student
  assert.equal((await mock.getMySignals(mock.DEMO_SESSION_ID)).length, 0);
  const text = await mock.explainSignal(id);
  assert.match(text, /Slide 1/);
  const [saved] = await mock.getSlideSignals(mock.DEMO_SESSION_ID, 1);
  assert.equal(saved.explanation, text);
});

const stroke = (slideNumber: number, x: number) => ({
  id: crypto.randomUUID(), sessionId: mock.DEMO_SESSION_ID, slideNumber,
  points: [{ x, y: .2 }, { x: x + .05, y: .25 }], color: "#e34948", width: .004,
});

test("annotations: add is retry-safe; get is oldest first without removed ones; subscribe sees added and removed", async () => {
  const events: string[] = [];
  const stop = mock.subscribeToAnnotations(mock.DEMO_SESSION_ID, e =>
    events.push(e.type === "added" ? `added ${e.annotation.id}` : `removed ${e.ids.join(",")}`));
  const a = stroke(1, .1), b = stroke(1, .3), c = stroke(2, .5);
  const savedA = await mock.addAnnotation(a);
  const retry = await mock.addAnnotation(a); // same id again: the saved stroke comes back, nothing new
  assert.equal(retry.createdAt, savedA.createdAt);
  await mock.addAnnotation(b);
  await mock.addAnnotation(c);
  await tick();
  assert.deepEqual((await mock.getAnnotations(mock.DEMO_SESSION_ID, 1)).map(x => x.id), [a.id, b.id]);
  assert.deepEqual((await mock.getAnnotations(mock.DEMO_SESSION_ID, 2)).map(x => x.id), [c.id]);
  await mock.removeAnnotations(mock.DEMO_SESSION_ID, [a.id]);
  await tick();
  assert.deepEqual((await mock.getAnnotations(mock.DEMO_SESSION_ID, 1)).map(x => x.id), [b.id]);
  stop();
  await mock.removeAnnotations(mock.DEMO_SESSION_ID, [b.id]);
  await tick();
  assert.deepEqual(events, [`added ${a.id}`, `added ${b.id}`, `added ${c.id}`, `removed ${a.id}`]);
});

test("annotations are validated", async () => {
  const add = (change: object) => mock.addAnnotation({ ...stroke(1, .1), ...change });
  await assert.rejects(add({ points: [] }), /1 to 2000 points/);
  await assert.rejects(add({ points: Array.from({ length: 2001 }, () => ({ x: .5, y: .5 })) }), /1 to 2000 points/);
  await assert.rejects(add({ points: [{ x: 1.2, y: .5 }] }), /outside the slide/);
  await assert.rejects(add({ width: 0 }), /Line width/);
  await assert.rejects(add({ width: .06 }), /Line width/);
  await assert.rejects(add({ color: "x".repeat(21) }), /Colour/);
  await assert.rejects(add({ slideNumber: 9 }), /doesn't exist/);
  assert.equal((await mock.getAnnotations(mock.DEMO_SESSION_ID, 1)).length, 0);
});
