/**
 * Nari's entire knowledge base. Nari is a narrow FAQ bot, not a general
 * assistant — src/app/api/nari/ask/route.ts matches incoming questions
 * against ONLY these entries and falls back to a fixed "I don't know"
 * response otherwise. Don't widen Nari's scope by inventing new policy here;
 * every answer below is grounded in something already built/decided
 * elsewhere in the codebase (Phase 1 auth, Phase 4 services, Phase 8
 * submissions/portal).
 */

export interface NariFAQEntry {
  id: string;
  question: string;
  /** Lowercased terms the matcher scores against — include obvious synonyms. */
  keywords: string[];
  answer: string;
  links?: { label: string; href: string }[];
}

export const NARI_FAQ: readonly NariFAQEntry[] = [
  {
    id: "how-to-submit",
    question: "How do I submit my manuscript?",
    keywords: [
      "submit",
      "submission",
      "manuscript",
      "send",
      "guidelines",
      "apply",
      "pitch",
      "query",
    ],
    answer:
      "Read our submission guidelines first, then submit your manuscript through our submission form — it asks for your manuscript title, a synopsis, who the book is for, and the file itself (PDF or Word).",
    links: [
      { label: "Submission guidelines", href: "/standards" },
      { label: "Submit your manuscript", href: "/submit" },
    ],
  },
  {
    id: "cost",
    question: "How much does it cost to publish with Narriva?",
    keywords: [
      "cost",
      "price",
      "pricing",
      "fee",
      "fees",
      "expensive",
      "money",
      "charge",
      "package",
      "rate",
    ],
    answer:
      "We structure our pricing around the scope of work. We don't have fixed packages — every book is different. Book a discovery call and we'll discuss your manuscript and give you a tailored estimate.",
    links: [{ label: "Book a discovery call", href: "/contact" }],
  },
  {
    id: "rights",
    question: "Will I lose my rights?",
    keywords: [
      "rights",
      "lose",
      "ip",
      "intellectual property",
      "ownership",
      "own",
      "copyright",
      "licence",
      "license",
    ],
    answer:
      "No. You retain all rights to your work. We take a publishing licence — meaning we have the right to produce, distribute, and sell the book for a specified period, but you own the IP. Full terms are covered in the Publishing Agreement, which we'll walk you through if you're accepted.",
  },
  {
    id: "own-cover-designer",
    question: "Can I use my own cover designer?",
    keywords: [
      "cover",
      "designer",
      "design",
      "own designer",
      "my designer",
      "artist",
      "illustrator",
    ],
    answer:
      "Yes, if their work meets our quality standards. We'll work with them, or you can choose our in-house design team.",
  },
  {
    id: "timeline",
    question: "How long does the process take?",
    keywords: [
      "long",
      "timeline",
      "how long",
      "duration",
      "weeks",
      "months",
      "wait",
      "process take",
    ],
    answer:
      "From submission to bookstore: typically 6-12 months, depending on the book's needs. First response on a submission takes 6-8 weeks.",
  },
  {
    id: "self-publish-later",
    question: "What if I want to self-publish later?",
    keywords: [
      "self-publish",
      "self publish",
      "reversion",
      "revert",
      "terminate",
      "end contract",
      "exit",
    ],
    answer:
      "Our contract includes clear terms for reversion of rights after a specified period. We're transparent about this during the agreement stage.",
  },
  {
    id: "need-agent",
    question: "Do I need an agent?",
    keywords: ["agent", "literary agent", "need an agent", "representation"],
    answer: "No. Narriva accepts direct submissions from authors.",
  },
  {
    id: "password-reset",
    question: "How do I reset my password?",
    keywords: [
      "password",
      "reset",
      "forgot",
      "login",
      "log in",
      "sign in",
      "account access",
      "locked out",
    ],
    answer:
      "We don't have self-service password reset built yet — email us and we'll help you regain access to your account directly.",
    links: [{ label: "Contact us", href: "/contact" }],
  },
  {
    id: "track-submission",
    question: "Where can I track my submission?",
    keywords: [
      "track",
      "status",
      "where is my",
      "progress",
      "submission status",
      "portal",
      "update",
      "check on",
    ],
    answer:
      "Your Author Portal shows your submission's status, and — once accepted — a timeline through editorial, design, production, and launch.",
    links: [{ label: "Go to your Author Portal", href: "/portal" }],
  },
] as const;

export const NARI_FALLBACK_MESSAGE =
  "I'm not sure about that one. The best next step is to book a call with our team or email us — I'll make sure you can do either from here.";

export const NARI_INTRO_MESSAGE =
  "Hi, I'm Nari. I can answer questions about submitting your manuscript, how publishing with us works, and account basics. For anything about your specific manuscript or contract, I'll point you to a real person.";
