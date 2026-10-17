export const categories = ["I don’t understand", "Need an example", "Why does this work?", "Other"] as const;
export type Category = typeof categories[number];
export type Rect = { x: number; y: number; width: number; height: number };
export type Signal = { id: string; slide: number; rect?: Rect; categories: Category[]; saved: true };
export type Phase = "presenting" | "reviewing";
export function advance(slide: number, phase: Phase, total: number): {slide: number; phase: Phase} {
  return phase === "presenting" ? {slide, phase: "reviewing"} : {slide: Math.min(slide + 1, total), phase: "presenting"};
}
export function atPoint(signals: Signal[], x: number, y: number) {
 return signals.filter(s => s.rect && x >= s.rect.x && x <= s.rect.x+s.rect.width && y >= s.rect.y && y <= s.rect.y+s.rect.height);
}
export function counts(signals: Signal[]) {
 return Object.fromEntries(categories.map(c => [c, signals.filter(s => s.categories.includes(c)).length])) as Record<Category, number>;
}
