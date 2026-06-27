interface StackedCover {
  title: string;
  author: string;
  cover: string;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  rotate: string;
  z?: number;
  ruleAbove?: boolean;
}

const COVERS: readonly StackedCover[] = [
  {
    title: "What the River Keeps",
    author: "AMARA DIALLO",
    cover: "#36514E",
    top: "54px",
    left: "8px",
    rotate: "-7deg",
  },
  {
    title: "The Inheritance of Silence",
    author: "KWAME MENSAH",
    cover: "#5A2A2A",
    bottom: "30px",
    right: "30px",
    rotate: "6deg",
  },
  {
    title: "The Salt Roads of Badagry",
    author: "ADAEZE OKONKWO",
    cover: "#283655",
    top: "96px",
    rotate: "0deg",
    z: 2,
    ruleAbove: true,
  },
];

/**
 * Composed stack of three flat book covers — static, no animation, per the
 * design handoff ("hero composed book stack ... static, no animation").
 * Deliberately not the looping SVG build animation used elsewhere; that
 * treatment doesn't appear in this design at all.
 */
export function HeroBookStack() {
  return (
    <div className="relative h-[520px]">
      {COVERS.map((c) => (
        <div
          key={c.title}
          className="absolute w-[198px] sm:w-[206px]"
          style={
            c.left === undefined && c.right === undefined
              ? {
                  top: c.top,
                  bottom: c.bottom,
                  left: "50%",
                  transform: `translateX(-50%) rotate(${c.rotate})`,
                  zIndex: c.z ?? 1,
                }
              : {
                  top: c.top,
                  bottom: c.bottom,
                  left: c.left,
                  right: c.right,
                  transform: `rotate(${c.rotate})`,
                  zIndex: c.z ?? 1,
                }
          }
        >
          <div
            className="flex h-[300px] flex-col justify-between border-l-4 border-black/[0.18] p-6 sm:h-[312px] sm:p-[30px]"
            style={{
              backgroundColor: c.cover,
              borderRadius: "3px 6px 6px 3px",
              boxShadow: "0 30px 55px -18px rgba(22,22,22,0.48)",
            }}
          >
            <span className="font-[family-name:var(--font-display)] text-[11px] italic text-white/60 sm:text-xs">
              Narriva
            </span>
            <div>
              {c.ruleAbove && <div className="mb-4 h-px w-7 bg-[var(--color-accent)]" />}
              <div className="font-[family-name:var(--font-display)] text-[23px] font-medium leading-[1.12] text-[#F3EEE3] sm:text-[27px]">
                {c.title}
              </div>
              <div className="mt-3 text-[11px] tracking-[0.05em] text-white/60">{c.author}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
