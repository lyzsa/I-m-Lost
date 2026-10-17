// Shared slide display. Frozen after the foundation: see docs/build-plan.md section 4.4.
// All positions are fractions 0..1 of the slide image, so boxes line up on any screen size.
import type { ComponentProps, ReactNode } from "react";
import type { Rect } from "@/lib/domain";

type SlideViewProps = ComponentProps<"div"> & { imageUrl: string; alt?: string; children?: ReactNode };

// The slide image at full width with nothing around it. Children are drawn on top of it.
// Pass pointer handlers (onPointerDown, onClick, ...) and a ref straight through, like on a <div>.
export function SlideView({ imageUrl, alt = "Slide", className = "", children, ...divProps }: SlideViewProps) {
  return (
    <div {...divProps} className={`relative w-full select-none overflow-hidden rounded-2xl border bg-white ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- plain img keeps the box exactly the image size */}
      <img src={imageUrl} alt={alt} draggable={false} className="pointer-events-none block h-auto w-full" />
      {children}
    </div>
  );
}

type RectBoxProps = {
  rect: Rect;
  className?: string;
  onClick?: () => void; // makes the box a button (tap, click, or Enter/Space); without it, clicks pass through to the slide
  title?: string;       // hover hint and screen-reader label for a clickable box
  children?: ReactNode; // drawn inside the box, e.g. a small icon
};

// A box drawn from a 0..1 rect, e.g. <RectBox rect={signal.rect} className="bg-orange-500/25" />.
export function RectBox({ rect, className = "", onClick, title, children }: RectBoxProps) {
  const style = { left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%` };
  if (!onClick) return <div className={`pointer-events-none absolute ${className}`} style={style}>{children}</div>;
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={e => { e.stopPropagation(); onClick(); }}
      className={`absolute cursor-pointer ${className}`}
      style={style}
    >
      {children}
    </button>
  );
}

// Turns a mouse/finger position into 0..1 fractions of `element` (pass the SlideView div, e.g. e.currentTarget).
export function toSlideFraction(event: { clientX: number; clientY: number }, element: Element): { x: number; y: number } {
  const box = element.getBoundingClientRect();
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  return { x: clamp((event.clientX - box.left) / box.width), y: clamp((event.clientY - box.top) / box.height) };
}
