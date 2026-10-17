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
