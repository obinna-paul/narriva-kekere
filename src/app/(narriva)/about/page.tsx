import { NarrivaTheme } from "@/components/theme";
import { PhotoPlaceholder } from "@/components/narriva/photo-placeholder";
import { NARRIVA_TEAM } from "@/content/narriva-team";

export const metadata = {
  title: "About",
  description:
    "Narriva exists to help authors make the best version of their book — editorial care, good design, and a team that stays invested until the book is out in the world.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <NarrivaTheme>
      <main>
        <section className="mx-auto max-w-[1000px] px-8 py-[120px] pb-[110px]">
          <div className="flex items-stretch gap-10">
            <div className="w-0.5 flex-none bg-[var(--color-accent)]" />
            <div>
              <div className="mb-[30px] text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-accent-text)]">
                Our mission
              </div>
              <p className="max-w-[780px] font-[family-name:var(--font-display)] text-[38px] font-normal leading-[1.3] tracking-[-0.015em] text-[var(--color-ink)]">
                Narriva exists to help authors make the best version of their book. We
                believe every manuscript deserves editorial care, good design, and a team
                that stays invested until the book is out in the world.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--color-ink)]/[0.07] bg-[var(--color-bg-alt)]">
          <div className="mx-auto max-w-[720px] px-8 py-20">
            <div className="flex flex-col gap-6 font-[family-name:var(--font-display)] text-xl leading-[1.7] text-[#2A2620]">
              <p>
                I started Narriva because I kept meeting writers with real books inside
                them and nowhere good to take them. The traditional houses were closed
                unless you already knew someone. The self-publishing tools were powerful
                and lonely — all the responsibility, none of the craft. And the vanity
                presses were happy to take your money and hand back something that looked
                it.
              </p>
              <p>
                There had to be a third thing: a house that treats a first-time author the
                way a good editor treats a writer they believe in. Patient with the
                manuscript. Honest about the work. Unwilling to ship anything that isn&apos;t
                as good as it can be.
              </p>
              <p>
                That&apos;s the whole company. We meet a book where it is, and we build it
                with the author — not for them — until it&apos;s worth reading. Everything else
                is detail.
              </p>
            </div>
            <div className="mt-[34px] text-[15px] text-[var(--color-muted)]">— Adaeze, founder</div>
          </div>
        </section>

        <section className="border-t border-[var(--color-ink)]/[0.07]">
          <div className="mx-auto max-w-[1140px] px-8 py-[90px] pb-[110px]">
            <div className="mx-auto mb-14 max-w-[560px] text-center">
              <div className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-accent-text)]">
                The people
              </div>
              <h2 className="font-[family-name:var(--font-display)] text-[38px] font-medium tracking-[-0.015em] text-[var(--color-ink)]">
                Who&apos;s behind the books
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-x-9 gap-y-11 sm:grid-cols-2 lg:grid-cols-3">
              {NARRIVA_TEAM.map((member) => (
                <div key={member.name}>
                  <PhotoPlaceholder label="team photo" aspect="1/1" className="rounded" />
                  <h3 className="mt-[18px] font-[family-name:var(--font-display)] text-2xl font-medium text-[var(--color-ink)]">
                    {member.name}
                  </h3>
                  <div className="mt-[5px] text-[13px] uppercase tracking-[0.04em] text-[var(--color-accent-text)]">
                    {member.role}
                  </div>
                  <p className="mt-3 text-[14.5px] leading-[1.6] text-[var(--color-muted)]">{member.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </NarrivaTheme>
  );
}
