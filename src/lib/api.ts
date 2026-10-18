// THE CONTRACT. Pages and components get data ONLY from this file.
// Names, inputs and outputs are frozen: see docs/build-plan.md section 4 before changing anything.
//
// NEXT_PUBLIC_USE_MOCK=false in .env.local -> real Supabase (src/lib/backend/supabase.ts)
// anything else (default)                 -> fake data in the browser (src/lib/backend/mock.ts)
import type { Annotation, AnnotationEvent, LivePhase, NewAnnotation, NewSignal, Session, Signal, Unsubscribe } from "./types";
import * as mock from "./backend/mock";
import * as real from "./backend/supabase";

export type Backend = {
  // Instructor (Person A)
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
  // Instructor pen strokes on the live slide (A draws, B shows)
  addAnnotation(a: NewAnnotation): Promise<Annotation>; // same id again = no duplicate
  getAnnotations(sessionId: string, slideNumber: number): Promise<Annotation[]>; // oldest first, not removed
  removeAnnotations(sessionId: string, ids: string[]): Promise<void>; // used for Undo and Clear slide
  subscribeToAnnotations(sessionId: string, onEvent: (e: AnnotationEvent) => void): Unsubscribe; // every slide of the class
};

export const usingMock = process.env.NEXT_PUBLIC_USE_MOCK !== "false";
const backend: Backend = usingMock ? mock : real;

export const {
  createSession, getSession, updateLive, subscribeToSession, getSlideSignals, subscribeToSignals, countStudents,
  joinSession, getMyStudentId, submitSignal, getMySignals, explainSignal, makeStudyGuide,
  addAnnotation, getAnnotations, removeAnnotations, subscribeToAnnotations,
} = backend;

export type { Annotation, AnnotationEvent, LivePhase, NewAnnotation, NewSignal, Session, Signal, Slide, Unsubscribe } from "./types";
