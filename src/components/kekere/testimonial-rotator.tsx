"use client";

import { useEffect, useState } from "react";

const QUOTES = [
  {
    text: "I read a whole story waiting for my order at the buka. Best ninety seconds of my day.",
    who: "Bisi · reader, Lagos",
  },
  {
    text: "Kekere published my first story. Three months later an editor at Narriva read my manuscript.",
    who: "Emeka · writer, Enugu",
  },
  {
    text: "It feels like a literary magazine that actually lives in my pocket. Warm, real, ours.",
    who: "Aisha · reader, Kano",
  },
  {
    text: "Short enough to finish, good enough to think about all week.",
    who: "Tomi · reader, Ibadan",
  },
];

export function TestimonialRotator() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % QUOTES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const quote = QUOTES[index];

  return (
    <section className="px-[22px] pb-[60px] pt-6 text-center">
      <div className="mx-auto max-w-[560px]">
        <div className="font-[family-name:var(--font-display)] text-[38px] leading-none text-[var(--color-primary)]">
          &ldquo;
        </div>
        <p className="font-[family-name:var(--font-display)] text-[clamp(21px,2.4vw,26px)] italic leading-[1.4] text-[var(--color-ink)]">
          {quote.text}
        </p>
        <p className="mt-[18px] text-[13px] text-[var(--color-ink-muted-2)]">
          {quote.who}
        </p>
      </div>

      <div className="mt-[22px] flex justify-center gap-2">
        {QUOTES.map((_, i) => (
          <span
            key={i}
            className="inline-block h-[7px] w-[7px] rounded-full"
            style={{
              background:
                i === index ? "#C75D2C" : "rgba(42,26,18,0.2)",
            }}
          />
        ))}
      </div>
    </section>
  );
}
