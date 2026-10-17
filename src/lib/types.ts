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
  explanation?: string;   // filled in by Explain Now
  createdAt: string;
};

export type NewSignal = Pick<Signal, "id" | "sessionId" | "slideNumber" | "kind" | "rect" | "categories">;

export type Unsubscribe = () => void;
