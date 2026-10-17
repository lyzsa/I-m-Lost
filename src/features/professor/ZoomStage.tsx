"use client";
// A fixed-size viewing area for a slide. The slide always fits inside it (any page shape: 16:9, 4:3, portrait A4),
// so the rest of the page never changes size. Zoom with the buttons, or pinch / Ctrl+scroll on a trackpad;
// when zoomed in, scroll to move around. Overlays drawn in 0..1 fractions zoom along with the slide.
// Usage: <ZoomStage imageUrl={slide.imageUrl}><SlideView imageUrl={slide.imageUrl}>...</SlideView></ZoomStage>
// (B can reuse this on the student screen; pass className to change the area's height.)
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const PAD = 24; // breathing room inside the area, px
const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 100) / 100));

// Width / height of an image, once it has loaded.
function useImageAspect(url: string): number | undefined {
  const [aspect, setAspect] = useState<{ url: string; value: number }>();
  useEffect(() => {
    const img = new Image();
    img.onload = () => { if (img.naturalHeight) setAspect({ url, value: img.naturalWidth / img.naturalHeight }); };
    img.src = url;
    return () => { img.onload = null; };
  }, [url]);
  return aspect?.url === url ? aspect.value : undefined;
}

export function ZoomStage({ imageUrl, children, className = "h-[calc(100vh-15rem)] min-h-80" }: {
  imageUrl: string; children: ReactNode; className?: string;
}) {
  const aspect = useImageAspect(imageUrl);
  const area = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number }>();
  const [zoom, setZoom] = useState(1);

  // Track the area's size so the slide can be fitted into it.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Pinch on a trackpad arrives as Ctrl+wheel. Zoom the slide instead of the whole browser page.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom(z => clampZoom(z * Math.exp(-e.deltaY / 200)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const fitWidth = size && aspect ? Math.max(0, Math.min(size.width - PAD, (size.height - PAD) * aspect)) : 0;
  // Is the slide bigger than the area (so there's something to drag around)?
  const pannable = !!size && !!aspect && (fitWidth * zoom + PAD > size.width + 1 || (fitWidth * zoom) / aspect + PAD > size.height + 1);

  // Drag to move around (mouse only; fingers already scroll natively). A press only becomes a drag after it moves
  // a few pixels, so a plain click still reaches the slide (e.g. the professor pinning a spot). Anything inside that
  // handles the press itself and calls preventDefault (like a paint layer) is left alone.
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const justDragged = useRef(false);
  const [dragging, setDragging] = useState(false);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || e.button !== 0 || e.defaultPrevented || !pannable) return;
    const el = e.currentTarget;
    drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false };
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 4) return;
      d.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
    }
    e.preventDefault(); // no text selection while dragging
    e.currentTarget.scrollLeft = d.left - dx;
    e.currentTarget.scrollTop = d.top - dy;
  }
  function endDrag() {
    if (drag.current?.moved) {
      justDragged.current = true; // swallow the click that follows a drag
      setTimeout(() => { justDragged.current = false; }, 0);
    }
    drag.current = null;
    setDragging(false);
  }

  return (
    <div className="relative">
      <div
        ref={area}
        className={`overflow-auto rounded-2xl bg-gray-200/70 ${className} ${
          dragging ? "select-none cursor-grabbing [&_*]:cursor-grabbing!" : pannable ? "cursor-grab [&_*]:cursor-grab!" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={e => { if (justDragged.current) { e.stopPropagation(); e.preventDefault(); } }}
      >
        <div className="flex items-center justify-center p-3" style={{ minWidth: "100%", minHeight: "100%", width: "max-content" }}>
          <div style={{ width: fitWidth * zoom, visibility: fitWidth ? "visible" : "hidden" }}>{children}</div>
        </div>
      </div>
      <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-xl bg-white/95 p-1 text-sm shadow">
        <button aria-label="Zoom out" className="h-8 w-8 rounded-lg hover:bg-gray-100" disabled={zoom <= MIN_ZOOM} onClick={() => setZoom(z => clampZoom(z - 0.25))}>−</button>
        <span className="w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
        <button aria-label="Zoom in" className="h-8 w-8 rounded-lg hover:bg-gray-100" disabled={zoom >= MAX_ZOOM} onClick={() => setZoom(z => clampZoom(z + 0.25))}>+</button>
        <button className="rounded-lg px-2 py-1 hover:bg-gray-100" disabled={zoom === 1} onClick={() => setZoom(1)}>Fit</button>
      </div>
    </div>
  );
}
