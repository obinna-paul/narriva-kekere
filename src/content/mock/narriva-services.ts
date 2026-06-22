/**
 * Static fallback copy for the Narriva services pages. Since Phase 7, the
 * public /services/* pages read from the `Service` Prisma model first (so
 * admin edits at /admin/services actually take effect) and fall back to this
 * file only if that service hasn't been seeded into the database yet — see
 * src/lib/data/services.ts and the page components under
 * src/app/(narriva)/services/.
 */

export interface ServiceIncludedItem {
  title: string;
  description: string;
}

export interface ServiceFAQ {
  question: string;
  answer: string;
}

export interface ServiceContent {
  slug: string;
  name: string;
  opening: string;
  included: readonly ServiceIncludedItem[];
  closing: string;
  costClarity: string;
  faqs: readonly ServiceFAQ[];
}

export const SERVICES: readonly ServiceContent[] = [
  {
    slug: "publishing",
    name: "Publishing",
    opening:
      "Publishing, to us, means everything between a finished manuscript and a book someone can hold, shelve, and recommend — editorial, design, production, and the launch itself, run by one team instead of four vendors who've never spoken to each other. If you're choosing between piecing this together yourself and handing it to us whole, this is the service that answers that question.",
    included: [
      {
        title: "Full editorial pass",
        description:
          "Developmental, line, and copy editing, so the manuscript is actually ready before it goes anywhere near a printer.",
      },
      {
        title: "Cover and interior design",
        description:
          "Built to compete on a shelf next to traditionally published books, not just look acceptable on a thumbnail.",
      },
      {
        title: "Production, start to finish",
        description:
          "ISBN registration, print-ready files, proof rounds, and digital formatting (EPUB/MOBI) handled end to end.",
      },
      {
        title: "A real launch plan",
        description:
          "Bookstore placement, a release date that isn't arbitrary, and a press push timed around it, not bolted on after.",
      },
      {
        title: "One point of contact",
        description:
          "A single person who owns your book through the whole process, so you're never relaying a note from your editor to your designer yourself.",
      },
    ],
    closing:
      "This is the service most of our authors are actually buying, even when they think they're buying \"editing\" or \"a cover\" — because a book that's only well-edited, or only well-designed, still isn't finished. Publishing is what happens when all of it works together.",
    costClarity:
      "Full-service publishing is priced around your manuscript's length, condition, and how many formats you need — not a flat package price, because a 60,000-word debut novel and a heavily illustrated memoir cost us genuinely different amounts of work.",
    faqs: [
      {
        question: "How much does this cost?",
        answer:
          "There's no public price list, because there's no single number that's honest. Cost depends on manuscript length, how much editorial work it needs, format count, and print run size. We'll give you a real number after we've actually read the manuscript, not before.",
      },
      {
        question: "How long does the whole process take?",
        answer:
          "Nine to fourteen months from signed agreement to launch day is typical — editorial alone is usually three to five months, with design and production running in parallel toward the end.",
      },
      {
        question: "Who owns the rights to my book?",
        answer:
          "You retain copyright. We take publishing rights for an agreed term and territory, laid out in the contract before any work starts, not buried in it.",
      },
      {
        question: "Can I use an editor or designer I already work with?",
        answer:
          "Yes. Tell us upfront — we'll review the work already done and build our process around it instead of redoing it from scratch. We do ask to run a final editorial and design review ourselves, since our name goes on the spine too.",
      },
    ],
  },
  {
    slug: "editorial",
    name: "Editorial Services",
    opening:
      "A spellcheck pass is not editing. Editing is a stranger reading your book the way your reader eventually will, and telling you, specifically, where it stopped working. We offer three levels, and we'll tell you honestly which one your manuscript needs rather than upselling you into the most expensive one.",
    included: [
      {
        title: "Developmental editing",
        description:
          "Structure, pacing, character, the architecture of the whole book. For manuscripts that have a strong idea but aren't yet built right.",
      },
      {
        title: "Line editing",
        description:
          "Sentence-level craft. Voice, rhythm, clarity, the texture of the prose itself.",
      },
      {
        title: "Copy editing & proofreading",
        description:
          "The final pass before anything goes to print. Grammar, consistency, continuity, the things that pull a reader out of a story when they're wrong.",
      },
    ],
    closing:
      "Every manuscript we publish goes through editorial review — it isn't optional. If you're not publishing with us but want editorial support on its own, we offer that as a standalone service too.",
    costClarity:
      "Editorial pricing depends on which level (or levels) your manuscript needs and its length — a developmental pass on a debut novel and a proofreading pass on a finished manuscript are different amounts of work, and we price them differently.",
    faqs: [
      {
        question: "How much does editing cost?",
        answer:
          "It depends on the level of editing and the manuscript's length. We'll read a sample before quoting anything, because pricing a manuscript we haven't read is just guessing.",
      },
      {
        question: "How long does an editorial pass take?",
        answer:
          "Developmental editing typically runs six to ten weeks. Line editing is four to six weeks. Copy editing and proofreading usually take two to three weeks.",
      },
      {
        question: "Who owns the rights to the edited manuscript?",
        answer:
          "You do, fully, whether or not you go on to publish with us. Editorial-only clients keep every right to their work.",
      },
      {
        question: "Can I use my own editor instead?",
        answer:
          "If you've already started developmental editing with someone you trust, tell us — we'll review their notes and build our process around the work already done instead of redoing it. If you're publishing with us, we do require a final editorial sign-off from our team, since the book carries our name too.",
      },
    ],
  },
  {
    slug: "design",
    name: "Design",
    opening:
      "A reader decides whether to pick up your book in under two seconds, and almost none of that decision is made by reading. Design is cover, interior layout, and typesetting working together to signal, instantly, that this book was made with the same care as the writing inside it.",
    included: [
      {
        title: "Cover design",
        description:
          "Concepting, full draft rounds, and revisions, built specifically for your genre's shelf — not a generic template with your title dropped in.",
      },
      {
        title: "Interior layout and typesetting",
        description:
          "Margins, type, chapter openers, and the dozens of small decisions that make a page comfortable to read for 300 pages, not just one.",
      },
      {
        title: "Format-specific files",
        description:
          "Print-ready PDFs at trim size, EPUB/MOBI for digital, sized and tested across the devices readers actually use.",
      },
      {
        title: "A design rationale walkthrough",
        description:
          "So you understand why the cover looks the way it does before you're asked to approve it, not just a file dropped in your inbox.",
      },
    ],
    closing:
      "We design every cover to survive being seen next to a traditionally published book on the same shelf — that's the actual bar, not \"good for self-published.\"",
    costClarity:
      "Design pricing depends on how many formats you need and how many revision rounds the cover takes to get right — most projects land somewhere between a single straightforward cover and a full cover-plus-interior package.",
    faqs: [
      {
        question: "How much does design cost?",
        answer:
          "It depends on scope — a cover alone costs less than a cover plus full interior layout across multiple formats. We'll scope it once we know what you actually need.",
      },
      {
        question: "How long does design take?",
        answer:
          "Four to eight weeks is typical for a cover and interior layout together, depending on revision rounds and how settled the concept is going in.",
      },
      {
        question: "Who owns the final design files?",
        answer:
          "You own the final approved files outright once the project is paid in full. We keep the right to show the work in our own portfolio unless you ask us not to.",
      },
      {
        question: "Can I use my own designer?",
        answer:
          "Yes — we can typeset an interior around a cover you've already commissioned, or take on interior-only work. We're flexible about where our process starts.",
      },
    ],
  },
  {
    slug: "author-growth",
    name: "Author Growth",
    opening:
      "A book that launches quietly and a book that launches with momentum can be identical on the page and have completely different outcomes. Author Growth is the work of making sure people who would actually like your book hear about it — before, during, and well after release day.",
    included: [
      {
        title: "A launch strategy built around your actual audience",
        description:
          "Not a generic checklist of \"post on social media,\" but a plan based on where your specific readers already are.",
      },
      {
        title: "Author platform setup",
        description:
          "Newsletter, author site presence, and a consistent voice across whatever channels make sense for your book — not all of them by default.",
      },
      {
        title: "Media and press outreach",
        description:
          "Review copies, podcast pitches, and interview placement where your readers actually pay attention.",
      },
      {
        title: "Post-launch tracking",
        description:
          "Sales data and audience growth, reported back to you in plain language, not a dashboard you have to interpret yourself.",
      },
    ],
    closing:
      "Most publishers stop caring about your book the day it ships. We built this service because we don't, and because a book's first six months in the world matter more than its first six days.",
    costClarity:
      "Author Growth is scoped around how big a push your launch needs and how long the campaign runs — a debut needing a from-scratch platform costs differently than an established author adding a launch push around an existing audience.",
    faqs: [
      {
        question: "How much does this cost?",
        answer:
          "It depends on campaign scope and length. We'll build a plan based on your book and your existing platform, then price that plan — not a generic monthly retainer.",
      },
      {
        question: "When should this start, and how long does it run?",
        answer:
          "Ideally two to three months before launch, continuing three to six months after. Starting earlier almost always outperforms starting late.",
      },
      {
        question: "Does this affect who owns my book's rights?",
        answer:
          "No. Marketing and growth work doesn't touch publishing rights, and any materials we create for your campaign remain usable by you afterward.",
      },
      {
        question: "Can I use my own publicist or social manager?",
        answer:
          "Yes — we'll coordinate directly with an existing publicist or social manager rather than duplicating their work, and focus our effort on the gaps.",
      },
    ],
  },
  {
    slug: "ghostwriting",
    name: "Ghostwriting",
    opening:
      "Ghostwriting is for the book that exists clearly in your head and nowhere else yet — you have the story, the expertise, or the life that's worth a book, but not the time or the craft to spend six months drafting it yourself. We write it, in your voice, from material only you can provide.",
    included: [
      {
        title: "Structured interviews and source review",
        description:
          "We extract the book from what you already know — your notes, recordings, and conversations — not from a blank page.",
      },
      {
        title: "A full draft manuscript",
        description:
          "Written in a voice we develop specifically to sound like you, not like us.",
      },
      {
        title: "Revision rounds",
        description:
          "You flag anything that doesn't sound right, factually or in tone, and we revise until it does.",
      },
      {
        title: "Complete confidentiality",
        description:
          "Credit arrangements — your name only, or a \"with\" credit — are your call, not ours, by default.",
      },
    ],
    closing:
      "A ghostwritten book still has to go through the same editorial and design process as anything else on our list before it's ready to publish — this service gets you a finished manuscript, not a finished book. Most authors pair it with our Publishing service to take it the rest of the way.",
    costClarity:
      "Ghostwriting is priced per project based on research depth and manuscript length, not per word — a memoir built from twenty hours of interviews is a different scope than one built from an existing journal.",
    faqs: [
      {
        question: "How much does ghostwriting cost?",
        answer:
          "It depends on how much source material exists and how long the finished manuscript needs to be. We price the project as a whole after an initial scoping conversation, not per word.",
      },
      {
        question: "How long does it take to get a full manuscript?",
        answer:
          "Four to eight months is typical, depending on how much interview and research time the project needs upfront.",
      },
      {
        question: "Who owns the manuscript?",
        answer:
          "You do, entirely. We sign a work-for-hire agreement and an NDA as standard, before any interviews begin.",
      },
      {
        question: "I've already started writing with someone else — can you pick it up?",
        answer:
          "Yes. Send us what exists and we'll either continue from it or tell you honestly if starting fresh would actually be faster — we'd rather give you that answer upfront than waste your time finding out later.",
      },
    ],
  },
] as const;

export function getServiceBySlug(slug: string): ServiceContent | undefined {
  return SERVICES.find((service) => service.slug === slug);
}
