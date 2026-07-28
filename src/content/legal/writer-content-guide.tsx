import { LegalLayout, LegalSection, LegalList } from "@/components/legal/legal-layout";

/**
 * Kekere's writer-facing story guidelines — what gets a submission through
 * review, what doesn't, and where the hard lines are. Static content on
 * purpose: this doesn't change often enough to justify a CMS or an
 * admin-editable content table, and a hardcoded page is trivial to edit and
 * redeploy the rare times it does.
 */
export function WriterContentGuide() {
  return (
    <LegalLayout
      title="Kekere's Story Guidelines"
      eyebrow="Writer Guide"
      intro="Before you start writing, a quick read — this is the difference between a story that sails through review and one that gets sent back with notes."
    >
      <LegalSection heading="Length">
        <p>
          Stories should be between 1,000 and 10,000 words. There&apos;s no bonus for length — a
          tightly written 1,500-word story beats a padded 9,000-word one every time. Write the
          story at the length it actually needs.
        </p>
      </LegalSection>

      <LegalSection heading="What We're Looking For">
        <p>
          We want stories, not fragments. A beginning, a middle, and an end — even if the ending
          is quiet, or leaves something unresolved on purpose. What we&apos;re really asking for
          is a compelling narrative: real stakes, real characters, and prose that earns the
          reader&apos;s attention rather than assuming it.
        </p>
        <p>
          Genre is wide open. Literary fiction, horror, romance, satire, thriller, speculative
          fiction, comedy — whatever the story needs to be. What matters isn&apos;t the category,
          it&apos;s the craft: is this interesting? Is it well written? Would a stranger, reading
          it on their phone on a bus, want to know what happens next?
        </p>
      </LegalSection>

      <LegalSection heading="What We Don't Publish">
        <p>A few things fall outside what we&apos;re building here:</p>
        <LegalList
          items={[
            "Poetry. Kekere is a fiction platform. However beautiful, poetry isn't what we publish.",
            "Fan fiction, or any story built on someone else's copyrighted characters or world.",
            "Excerpts or chapters pulled from a longer work. Every story on Kekere needs to be complete in itself.",
            "Essays, memoir, or other nonfiction. We're fiction only.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="Our Policy on AI">
        <p>
          Kekere pays real writers for real craft, and that only works if the stories on the
          platform are actually written by the people submitting them.
        </p>
        <p>
          Using AI to generate your story — prompting a tool to write some or all of the actual
          prose — isn&apos;t allowed here, regardless of how much you edit it afterward. If the
          sentences weren&apos;t yours first, the story isn&apos;t yours either, and that&apos;s
          the line.
        </p>
        <p>
          Using AI as a tool alongside your own writing is different, and that&apos;s fine within
          reason — brainstorming, checking grammar, or getting feedback on a draft you wrote
          yourself. If you&apos;re ever unsure whether something crosses the line, ask before you
          submit, not after.
        </p>
        <p>
          We can&apos;t catch everything, and we&apos;re not trying to run a detection arms race.
          What we&apos;re asking for is honesty: submit work you actually wrote. Stories found to
          violate this policy will be rejected, and repeat violations may result in the loss of
          your ability to submit to Kekere.
        </p>
      </LegalSection>

      <LegalSection heading="A Few Ground Rules">
        <p>
          Kekere allows mature themes and content, including work tagged as explicit — we&apos;re
          not asking you to write safe. But there are hard lines regardless of genre or tag: no
          content that sexualizes minors, promotes real-world violence or hatred against real
          people or groups, or otherwise breaks Nigerian or applicable law. Stories that cross
          these lines are rejected outright, no exceptions.
        </p>
      </LegalSection>

      <LegalSection heading="Last thing">
        <p>
          None of this is about making things harder. It&apos;s about keeping Kekere a place
          readers can trust and writers can be proud to be published on. If you&apos;ve got a
          story that does what a good story should do, we want to read it.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
