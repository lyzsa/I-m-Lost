// THE CONTRACT. Pages and components get data ONLY from this file.
// Names, inputs and outputs are frozen: see TASKS.md section 4 before changing anything.
//
// NEXT_PUBLIC_USE_MOCK=false in .env.local -> real Supabase (src/lib/backend/supabase.ts)
// anything else (default)                 -> fake data in the browser (src/lib/backend/mock.ts)
import type { LivePhase, NewSignal, Session, Signal, Unsubscribe } from "./types";
import * as mock from "./backend/mock";
import * as real from "./backend/supabase";

export type Backend = {
  // Professor (Person A)
  createSession(title: string, slides: { image: Blob; text: string }[]): Promise<Session>;
  getSession(sessionId: string): Promise<Session | null>;
  updateLive(sessionId: string, currentSlide: number, phase: LivePhase): Promise<void>;
  subscribeToSession(sessionId: string, onChange: (session: Session) => void): Unsubscribe;
  getSlideSignals(sessionId: string, slideNumber: number): Promise<Signal[]>;
  subscribeToSignals(sessionId: string, onNew: (signal: Signal) => void): Unsubscribe;
  countStudents(sessionId: string): Promise<number>;
  // Student (Person B)
  joinSession(code: string, name: string): Promise<Session>; // throws "No class with that code" | "This class has ended"
  getMyStudentId(): string;
  submitSignal(signal: NewSignal): Promise<Signal>; // retry-safe with the same id; throws "You already tapped I'm Lost on this slide"
  getMySignals(sessionId: string): Promise<Signal[]>;
  explainSignal(signalId: string): Promise<string>;
  makeStudyGuide(sessionId: string): Promise<string>;
};

export const usingMock = process.env.NEXT_PUBLIC_USE_MOCK !== "false";
const backend: Backend = usingMock ? mock : real;

export const {
  createSession, getSession, updateLive, subscribeToSession, getSlideSignals, subscribeToSignals, countStudents,
  joinSession, getMyStudentId, submitSignal, getMySignals, explainSignal, makeStudyGuide,
} = backend;

export type { LivePhase, NewSignal, Session, Signal, Slide, Unsubscribe } from "./types";
