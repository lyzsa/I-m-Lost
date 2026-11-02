// STYLE MOCK-UP for team discussion (static, no functions): the instructor live screen with the SAME layout and
// buttons, re-skinned in a "campus portal" look (navy bar, grey page, crisp white cards, navy buttons, blue links).
import { RectBox, SlideView } from "@/components/SlideView";

const NAVY = "#0b2a5c";
const LINK = "#0a72b6";
const TEAL = "#1f7a8c";
const GREEN = "#1d8c5a";

const card = "rounded-sm bg-white shadow-[0_1px_3px_rgba(0,0,0,.18)]";
const btn = "rounded-sm px-4 py-2 text-sm font-bold text-white";
const btnOutline = "rounded-sm border-2 px-4 py-2 text-sm font-bold";

function Bar({ label, n, max }: { label: string; n: number; max: number }) {
  return (
    <li className="text-sm">
      <div className="flex justify-between"><span>{label}</span><b>{n}</b></div>
      <div className="mt-1 h-2 bg-[#e6e6e6]"><div className="h-2" style={{ width: `${(n / max) * 100}%`, background: NAVY }} /></div>
    </li>
  );
}

export default function StyleMock() {
  return (
    <div className="min-h-screen bg-[#ececec] font-[Arial,Helvetica,sans-serif] text-[#2d3b45]">
      {/* header: same items as the real page (logo, class title, "Instructor's view"), portal colours */}
      <header className="flex h-[60px] items-center justify-between px-6 text-white" style={{ background: NAVY }}>
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-2 font-bold tracking-widest">
            <span className="grid h-8 w-8 place-items-center rounded-sm bg-white text-lg" style={{ color: NAVY }}>?</span> LOST
          </span>
          <span className="h-6 w-px bg-white/30" />
          <h1 className="text-xl font-bold">Pointers 101</h1>
        </div>
        <span className="text-sm text-white/80">Instructor&apos;s view</span>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {/* slide area */}
          <div className={`${card} relative p-6`}>
            <div className="absolute right-3 top-3 z-10 flex items-center gap-1 border bg-white p-1 text-sm">
              <span className="px-2">−</span><span className="w-12 text-center">100%</span><span className="px-2">+</span>
              <span className="px-2" style={{ color: LINK }}>Fit</span>
            </div>
            <SlideView imageUrl="/demo-slides/1.svg" alt="Slide 1" className="rounded-none">
              <RectBox rect={{ x: .05, y: .35, width: .55, height: .2 }} className="bg-orange-500/25" />
              <RectBox rect={{ x: .3, y: .4, width: .45, height: .25 }} className="bg-orange-500/25" />
              <RectBox rect={{ x: .35, y: .42, width: .2, height: .15 }} className="bg-orange-500/25" />
              <RectBox rect={{ x: .3, y: .42, width: .28, height: .13 }} className="border-2 border-dashed" />
              <div className="absolute w-52 border bg-white p-2.5 text-xs shadow-md" style={{ left: "60%", top: "40%" }}>
                <p className="flex items-center gap-2 font-bold">
                  <span className="grid h-5 w-5 place-items-center rounded-full text-white" style={{ background: NAVY }}>1</span>
                  3 students marked here
                </p>
                <p className="mt-1 flex justify-between">Other <b>3</b></p>
                <p className="underline" style={{ color: LINK }}>View 3 responses →</p>
                <p className="mt-1 flex justify-between">Need an example <b>1</b></p>
              </div>
            </SlideView>
          </div>

          {/* thumbnails */}
          <nav className={`${card} mt-3 flex items-center gap-2 p-2`}>
            <span className={`${btnOutline} text-gray-400`} style={{ borderColor: "#d0d0d0" }}>‹ Prev</span>
            <div className="flex flex-1 gap-2">
              {[1, 2, 3].map(n => (
                <div key={n} className={`relative h-14 w-24 border-2 bg-white ${n === 1 ? "" : "border-transparent"}`} style={n === 1 ? { borderColor: NAVY } : undefined}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/demo-slides/${n}.svg`} alt="" className="h-full w-full object-contain" />
                  <span className="absolute bottom-0.5 left-0.5 px-1 text-xs font-bold text-white" style={{ background: n === 1 ? NAVY : "#6b7280" }}>{n}</span>
                </div>
              ))}
            </div>
            <span className={btnOutline} style={{ borderColor: NAVY, color: NAVY }}>Next ›</span>
          </nav>

          {/* draw toolbar */}
          <div className={`${card} mt-3 flex flex-wrap items-center gap-2 p-1.5 text-sm`}>
            <span className={btn} style={{ background: NAVY }}>✎ Draw on slide</span>
          </div>

          {/* heatmap row */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className={`${btnOutline} bg-white`} style={{ borderColor: NAVY, color: NAVY }}>Hide heatmap (clean view)</span>
            <span className="text-sm">3 boxes on this slide · darker = more overlap</span>
            <span className={`${card} flex items-center gap-2 px-3 py-1.5 text-sm`}>
              Dense areas: at least
              <span className="grid h-7 w-7 place-items-center border">−</span><b>2</b><span className="grid h-7 w-7 place-items-center border">+</span>
              students on the same spot <span className="text-gray-500">· 1 found</span>
            </span>
          </div>
        </div>

        {/* side column: same three blocks as the real page */}
        <aside className="space-y-4">
          <section className={card}>
            <h2 className="px-5 py-2 text-sm font-bold tracking-widest text-white" style={{ background: TEAL }}>JOIN CODE</h2>
            <div className="p-5 text-center">
              <p className="font-mono text-5xl font-bold tracking-[0.2em]" style={{ color: NAVY }}>DEMO01</p>
              <div className="mx-auto mt-3 grid h-32 w-32 place-items-center border-2 border-dashed text-xs text-gray-400">QR code</div>
              <p className="mt-2 text-xs underline" style={{ color: LINK }}>i-m-lost.vercel.app/join?code=DEMO01</p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span><b>24</b> students joined</span>
                <span className="underline" style={{ color: LINK }}>Show large</span>
              </div>
            </div>
          </section>

          <section className={`${card} p-5`}>
            <p className="text-sm">Slide 1 of 3 · <b>Reviewing feedback</b></p>
            <span className={`${btn} mt-3 block py-3 text-center text-lg`} style={{ background: NAVY }}>Next slide</span>
            <span className={`${btnOutline} mt-3 block text-center`} style={{ borderColor: "#b42318", color: "#b42318" }}>End class now</span>
          </section>

          <section className={`${card} p-5`}>
            <h2 className="text-xl font-bold" style={{ color: GREEN }}>Feedback on this slide</h2>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[["I'm Lost", 2], ["Boxes", 3], ["Students", 4]].map(([k, v]) => (
                <div key={k} className="border-t-4 bg-[#f5f5f5] p-2" style={{ borderColor: NAVY }}>
                  <dt className="text-xs">{k}</dt><dd className="text-2xl font-bold" style={{ color: NAVY }}>{v}</dd>
                </div>
              ))}
            </dl>
            <h3 className="mt-4 text-sm font-bold">Why students boxed this slide</h3>
            <ul className="mt-2 space-y-2">
              <Bar label="I don’t understand" n={0} max={3} />
              <Bar label="Need an example" n={1} max={3} />
              <Bar label="Why does this work?" n={1} max={3} />
              <Bar label="Other" n={3} max={3} />
            </ul>
            <p className="mt-1 text-xs font-bold underline" style={{ color: LINK }}>View 3 responses →</p>
            <p className="mt-4 border border-sky-300 bg-sky-100 p-3 text-xs">ⓘ Point at a dark area on the slide to see why students boxed it. Click to pin it here.</p>
          </section>
        </aside>
      </main>

      <footer className="border-t px-6 py-3 text-right text-xs text-gray-500">Style mock-up · same layout as the instructor live screen · no functions</footer>
    </div>
  );
}
