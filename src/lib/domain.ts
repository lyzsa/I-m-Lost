export const categories = ["I don’t understand", "Need an example", "Why does this work?", "Other"] as const;
export type Category = typeof categories[number];
export type Rect = { x: number; y: number; width: number; height: number };
export type Phase = "presenting" | "reviewing";
// Anything with an optional box and categories: the real Signal (src/lib/types.ts) and the /demo sandbox's DemoSignal both fit.
type Marked = { rect?: Rect; categories: readonly Category[] };
export type DemoSignal = { id: string; slide: number; rect?: Rect; categories: Category[]; saved: true };
export function advance(slide: number, phase: Phase, total: number): {slide: number; phase: Phase} {
  return phase === "presenting" ? {slide, phase: "reviewing"} : {slide: Math.min(slide + 1, total), phase: "presenting"};
}
export function atPoint<T extends Marked>(signals: T[], x: number, y: number): T[] {
 return signals.filter(s => s.rect && x >= s.rect.x && x <= s.rect.x+s.rect.width && y >= s.rect.y && y <= s.rect.y+s.rect.height);
}
export function counts(signals: Marked[]) {
 return Object.fromEntries(categories.map(c => [c, signals.filter(s => s.categories.includes(c)).length])) as Record<Category, number>;
}
