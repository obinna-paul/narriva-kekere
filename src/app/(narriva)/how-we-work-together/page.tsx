import Link from "next/link";
import { NarrivaTheme } from "@/components/theme";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export const metadata = {
  title: "How We Work",
  description:
    "From submission to launch: how Narriva assesses a manuscript, what to expect at each stage, and how long it takes.",
  alternates: { canonical: "/how-we-work-together" },
};

const ASSESS = [
  {
    title: "Narrative structure",
    description:
      "How the book is built — where it starts, how it moves, whether the shape serves the story or fights it.",
  },
  {
    title: "Prose quality",
    description:
      "Sentence by sentence: rhythm, clarity, and whether the voice is doing what the author wants it to.",
  },
  {
    title: "Clarity of audience",
    description:
      "Who this book is for. The strongest manuscripts know their reader; we help the others find theirs.",
  },
  {
    title: "Completeness",
    description:
      "Where the manuscript actually is — a rough draft, a polished one, or something in between — so we can scope honestly.",
  },
] as const;

const STEPS = [
  {
    title: "Submit",
    time: "Day one",
    body: "Send your manuscript and a short note on what it is and who it's for. We confirm we've got it the same day.",
  },
  {
    title: "Assess",
    time: "6–8 weeks",
    body: "An editor reads the whole manuscript and writes you an honest assessment: what it needs, where it shines, and what we'd recommend.",
  },
  {
    title: "Plan",
    time: "1 week",
    body: "We scope the work together and agree on the path from where the manuscript is to publication — timeline, services, and cost.",
  },
  {
    title: "Build",
    time: "3–6 months",
    body: "Editorial passes, design, interior layout. The longest part, and the part that matters most. You stay in the loop throughout.",
  },
  {
    title: "Produce",
    time: "3–4 weeks",
    body: "ISBN, print-ready files, digital formatting, and proofs. The unglamorous machinery that makes a book real.",
  },
  {
    title: "Launch",
    time: "Ongoing",
    body: "Your book goes live in the bookstore with a plan behind it, not just a listing — and we stay invested in what happens next.",
  },
] as const;

export default function HowWeWorkPage() {
  return (
    <NarrivaTheme>
      <main>
        {/* Hero */}
        <header className="mx-auto max-w-[720px] px-8 pt-[84px]">
          <div className="mb-[18px] text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-accent-text)]">
            How we work
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-[40px] font-medium leading-[1.05] tracking-[-0.02em] text-[var(--color-ink)] sm:text-[50px]">
            We meet a manuscript where it is
          </h1>
          <p className="mt-6 font-[family-name:var(--font-display)] text-[19px] leading-[1.65] text-[#2A2620] sm:text-[21px]">
            Narriva&apos;s job is not to judge a manuscript pass or fail. It&apos;s to read
            it carefully, work out what it needs to become the best version of itself, and
            build from there. Some books need deep editorial work. Some need a light pass
            and a great cover. We tell you honestly which — and then we do it.
          </p>
        </header>

        {/* What we look at */}
        <section className="mx-auto max-w-[720px] px-8 pt-16">
          <h2 className="mb-2 font-[family-name:var(--font-display)] text-[30px] font-medium tracking-[-0.01em] text-[var(--color-ink)]">
            What we look at
          </h2>
          <p className="mb-[30px] text-[15px] text-[var(--color-muted-3)]">
            Not a checklist to pass — the things we read for when we&apos;re working out
            what a book needs.
          </p>
          <div>
            {ASSESS.map((item) => (
              <div
                key={item.title}
                className="flex gap-5 border-b border-[var(--color-ink)]/[0.08] py-[22px] last:border-0"
              >
                <span className="mt-[9px] h-[7px] w-[7px] flex-none rounded-full bg-[var(--color-accent)]" />
                <div>
                  <div className="font-[family-name:var(--font-display)] text-[17px] font-semibold text-[var(--color-ink)]">
                    {item.title}
                  </div>
                  <div className="mt-1.5 text-[15px] leading-[1.65] text-[var(--color-muted)]">
                    {item.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* After you submit */}
        <section className="mt-20 border-t border-[var(--color-ink)]/[0.07] bg-[var(--color-bg-alt)]">
          <div className="mx-auto max-w-[760px] px-8 py-20">
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-[34px] font-medium tracking-[-0.015em] text-[var(--color-ink)]">
              What happens after you submit
            </h2>
            <p className="mb-12 max-w-[520px] text-base leading-[1.6] text-[var(--color-muted)]">
              Most authors hear back within six to eight weeks of submission with an
              assessment and a proposed plan. Here&apos;s the whole path.
            </p>
            <div className="relative pl-10">
              <div className="absolute bottom-2 left-[13px] top-2 w-px bg-[var(--color-primary)]/20" />
              {STEPS.map((step, i) => (
                <div key={step.title} className="relative pb-[38px] last:pb-0">
                  <div className="absolute left-[-40px] top-0 flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-[var(--color-primary)] bg-[var(--color-bg-alt)] font-[family-name:var(--font-display)] text-[13px] font-semibold text-[var(--color-primary)]">
                    {i + 1}
                  </div>
                  <div className="flex flex-wrap items-baseline gap-3.5">
                    <h3 className="font-[family-name:var(--font-display)] text-[19px] font-semibold text-[var(--color-ink)]">
                      {step.title}
                    </h3>
                    <span className="text-[12.5px] tracking-[0.02em] text-[var(--color-accent-text)]">
                      {step.time}
                    </span>
                  </div>
                  <p className="mt-2 max-w-[560px] text-[15px] leading-[1.65] text-[var(--color-muted)]">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How we work with you */}
        <section className="border-t border-[var(--color-ink)]/[0.07]">
          <div className="mx-auto max-w-[720px] px-8 pb-10 pt-20">
            <h2 className="mb-6 font-[family-name:var(--font-display)] text-[34px] font-medium tracking-[-0.015em] text-[var(--color-ink)]">
              How we work with you
            </h2>
            <div className="font-[family-name:var(--font-display)] text-xl leading-[1.7] text-[#2A2620]">
              <p className="mb-[22px]">
                You get a single point of contact who knows your book — not a relay of
                strangers. You have visibility into where things stand at every stage, and
                you have a real say in the decisions that matter: cover direction, title,
                how the book is positioned.
              </p>
              <p>
                We build the book <span className="italic text-[var(--color-primary)]">with</span>{" "}
                you, not for you. That&apos;s the part most publishers skip, and it&apos;s
                the part that makes the difference.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-[720px] px-8 pb-[100px] pt-[30px] text-center">
          <Link href="/submit" className={cn(buttonVariants({ size: "lg" }), "px-8 py-4 text-[15px] font-semibold")}>
            Submit your manuscript
          </Link>
        </section>
      </main>
    </NarrivaTheme>
  );
}
