// Shared data shapes. Frozen: see TASKS.md section 4.6 before changing anything here.
import type { Category, Phase, Rect } from "./domain";

export type LivePhase = Phase | "ended"; // "presenting" | "reviewing" | "ended"

export type Slide = {
  number: number;     // starts at 1
  imageUrl: string;   // a picture of the slide
  text: string;       // text pulled from the PDF ("" if none)
};

export type Session = {
  id: string;
  code: string;       // 6 characters, e.g. "K7Q2PX"
  title: string;
  slides: Slide[];    // sorted by number
  currentSlide: number;
  phase: LivePhase;
};

export type Signal = {
  id: string;             // made in the browser with crypto.randomUUID()
  sessionId: string;
  slideNumber: number;    // the slide the student was LOOKING AT, not necessarily the live one
  studentId: string;
  kind: "lost" | "region";
  rect?: Rect;            // only for "region"; x, y, width, height are all 0..1
  categories: Category[]; // empty for "lost", at least one for "region"
  otherText?: string;     // the student's own words; required (1-200 chars) when "Other" is picked, absent otherwise
  explanation?: string;   // filled in by Explain Now
  createdAt: string;
};

export type NewSignal = Pick<Signal, "id" | "sessionId" | "slideNumber" | "kind" | "rect" | "categories" | "otherText">;

// One pen stroke the instructor drew on a slide. Saved when the pen lifts; every student sees it.
export type Annotation = {
  id: string;                          // made in the browser with crypto.randomUUID(); retry-safe
  sessionId: string;
  slideNumber: number;
  points: { x: number; y: number }[];  // 0..1 fractions of the slide, in drawing order
  color: string;                       // CSS colour, e.g. "#e34948"
  width: number;                       // line width as a fraction of the slide WIDTH, e.g. 0.004
  createdAt: string;
};
export type NewAnnotation = Omit<Annotation, "createdAt">;
export type AnnotationEvent =
  | { type: "added"; annotation: Annotation }
  | { type: "removed"; ids: string[] };

export type Unsubscribe = () => void;
