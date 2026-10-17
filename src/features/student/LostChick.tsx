// The LOST mascot: a little chick who is just as lost as you are. Pure SVG, animations live in the <style> below.
// mood: "lost" (default, swirly eyes), "thinking" (looking up while we search), "dizzy" (something went wrong), "found" (happy).
export type ChickMood = "lost" | "thinking" | "dizzy" | "found";

// A swirl drawn outward from (cx, cy) with half-circle arcs that grow each turn.
function swirl(cx: number, cy: number) {
  let d = `M${cx} ${cy}`;
  for (let i = 1; i <= 5; i++) d += ` a${i * 1.6} ${i * 1.6} 0 0 1 ${(i % 2 ? 1 : -1) * i * 3.2} 0`;
  return d;
}

export function LostChick({ mood = "lost", className = "" }: { mood?: ChickMood; className?: string }) {
  const marks = mood === "found" ? ["♪", "★", "♪"] : mood === "dizzy" ? ["?!", "?", "!?"] : ["?", "?", "?"];
  return (
    <svg viewBox="0 0 200 200" className={`lm ${className}`} role="img" aria-label="A confused little chick">
      <style>{`
        .lm-sway{transform-origin:100px 185px;animation:lm-sway 3.2s ease-in-out infinite}
        .lm-shake{animation:lm-shake .5s ease-in-out 2}
        .lm-hop{animation:lm-hop .6s ease-in-out infinite}
        .lm-float{animation:lm-float 2.4s ease-in-out infinite}
        .lm-spin{transform-box:fill-box;transform-origin:center;animation:lm-spin 2.4s linear infinite}
        .lm-dizzy .lm-spin{animation-duration:.6s}
        .lm-blink{transform-box:fill-box;transform-origin:center;animation:lm-blink 4s infinite}
        @keyframes lm-sway{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}
        @keyframes lm-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
        @keyframes lm-hop{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes lm-float{0%,100%{transform:translateY(0);opacity:.75}50%{transform:translateY(-9px);opacity:1}}
        @keyframes lm-spin{to{transform:rotate(360deg)}}
        @keyframes lm-blink{0%,92%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}
        @media (prefers-reduced-motion:reduce){.lm *{animation:none!important}}
      `}</style>

      {/* floating marks above the head */}
      <g fontFamily="inherit" fontWeight="bold" fill={mood === "dizzy" ? "#f43f5e" : "#f59e0b"}>
        {marks.map((m, i) => (
          <text key={i} className="lm-float" style={{ animationDelay: `${i * 0.5}s` }}
            x={[42, 96, 150][i]} y={[46, 26, 50][i]} fontSize={[22, 28, 20][i]} textAnchor="middle">{m}</text>
        ))}
      </g>

      {/* ground shadow */}
      <ellipse cx="100" cy="188" rx="46" ry="7" fill="#000" opacity=".08" />

      <g className={mood === "found" ? "lm-hop" : mood === "dizzy" ? "lm-shake" : ""}>
        <g className={`lm-sway ${mood === "dizzy" ? "lm-dizzy" : ""}`}>
          {/* feet */}
          <path d="M82 176 l-6 8 M82 176 l0 9 M82 176 l6 8 M118 176 l-6 8 M118 176 l0 9 M118 176 l6 8"
            stroke="#f97316" strokeWidth="4" strokeLinecap="round" />
          {/* body */}
          <circle cx="100" cy="124" r="56" fill="#fde047" />
          <ellipse cx="100" cy="142" rx="34" ry="30" fill="#fef9c3" />
          {/* hair tuft */}
          <path d="M100 70 q-6 -16 4 -22 M100 70 q4 -14 16 -14 M100 70 q-10 -8 -18 -4"
            stroke="#facc15" strokeWidth="5" fill="none" strokeLinecap="round" />
          {/* cheeks */}
          <ellipse cx="66" cy="128" rx="9" ry="6" fill="#fda4af" opacity=".8" />
          <ellipse cx="134" cy="128" rx="9" ry="6" fill="#fda4af" opacity=".8" />

          {/* eyes */}
          {mood === "found" ? (
            <path d="M70 112 q8 -10 16 0 M114 112 q8 -10 16 0" stroke="#3f2d1d" strokeWidth="4" fill="none" strokeLinecap="round" />
          ) : mood === "thinking" ? (
            <g fill="#3f2d1d" className="lm-blink">
              <circle cx="78" cy="106" r="6" /><circle cx="122" cy="106" r="6" />
              <circle cx="80" cy="103" r="2" fill="#fff" /><circle cx="124" cy="103" r="2" fill="#fff" />
            </g>
          ) : (
            <g stroke="#3f2d1d" strokeWidth="2.6" fill="none" strokeLinecap="round">
              <path className="lm-spin" d={swirl(77, 110)} />
              <path className="lm-spin" d={swirl(121, 110)} style={{ animationDirection: "reverse" }} />
            </g>
          )}

          {/* beak: small "o" when lost, smile when found */}
          {mood === "found"
            ? <path d="M92 124 q8 10 16 0 z" fill="#fb923c" />
            : <ellipse cx="100" cy="127" rx="7" ry={mood === "dizzy" ? 7 : 5} fill="#fb923c" />}

          {/* left wing scratching head, right wing holding an upside-down map */}
          <path d="M48 118 q-14 -20 4 -34" stroke="#facc15" strokeWidth="12" fill="none" strokeLinecap="round" />
          <g transform="rotate(14 150 150)">
            <rect x="132" y="134" width="40" height="30" rx="3" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="2.5" />
            <path d="M145 134 v30 M158 134 v30" stroke="#38bdf8" strokeWidth="1.5" />
            <path d="M137 156 q10 -14 18 -6 t14 -10" stroke="#f43f5e" strokeWidth="2" strokeDasharray="3 3" fill="none" />
            <text x="166" y="146" fontSize="9" fill="#f43f5e" fontWeight="bold" textAnchor="middle">✕</text>
          </g>
          <ellipse cx="146" cy="150" rx="9" ry="8" fill="#facc15" />
        </g>
      </g>
    </svg>
  );
}
