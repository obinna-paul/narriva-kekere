"use client";

import { useEffect, useRef, useState } from "react";

export function CalendlyWidget({ url }: { url: string }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const startedRef = useRef(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (window.Calendly) {
      setReady(true);
      doneRef.current = true;
      return;
    }

    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    script.onload = () => {
      setReady(true);
      doneRef.current = true;
    };
    script.onerror = () => {
      setError(true);
      doneRef.current = true;
    };
    document.head.appendChild(script);

    const timeout = setTimeout(() => {
      if (!doneRef.current) setError(true);
    }, 10_000);

    return () => clearTimeout(timeout);
  }, []);

  if (error) {
    return (
      <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-alt)] p-6">
        <p className="text-[14.5px] leading-[1.6] text-[var(--color-muted)]">
          The scheduling widget couldn&apos;t load right now. Email us at{" "}
          <a href="mailto:hello@narriva.pro" className="text-[var(--color-primary)] underline">
            hello@narriva.pro
          </a>{" "}
          and we&apos;ll schedule manually.
        </p>
      </div>
    );
  }

  return (
    <div className="relative mt-6">
      {!ready && (
        <div
          aria-hidden
          className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-alt)]"
          style={{ minWidth: "320px", height: "520px" }}
        >
          <div className="flex items-center gap-2 text-[var(--color-muted)]">
            <span className="inline-block h-[5px] w-[5px] animate-bounce rounded-full bg-[var(--color-muted-3)]/60" style={{ animationDelay: "0ms" }} />
            <span className="inline-block h-[5px] w-[5px] animate-bounce rounded-full bg-[var(--color-muted-3)]/60" style={{ animationDelay: "150ms" }} />
            <span className="inline-block h-[5px] w-[5px] animate-bounce rounded-full bg-[var(--color-muted-3)]/60" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      )}
      <div
        className="calendly-inline-widget rounded-lg border border-[var(--color-border)]"
        data-url={url}
        style={{ minWidth: "320px", height: "520px" }}
      />
    </div>
  );
}
