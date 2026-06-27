import type { FAQAccordionItem } from "@/components/narriva/faq-accordion";

export interface HelpCategory {
  label: string;
  faqs: readonly FAQAccordionItem[];
}

export const HELP_CATEGORIES: readonly HelpCategory[] = [
  {
    label: "For Authors",
    faqs: [
      {
        question: "How do I submit my manuscript?",
        answer:
          "Head to the Submit page, tell us about your book, and upload your manuscript as a PDF or DOCX. We read every submission personally.",
      },
      {
        question: "How long until I hear back?",
        answer:
          "Most authors hear back within six to eight weeks of submission with an assessment and a proposed plan. If we have questions before then, we reach out.",
      },
      {
        question: "Do you reject manuscripts?",
        answer:
          "We don't think of it as pass or fail. We assess what a manuscript needs and propose a path. Some need deep editorial work, some need a light pass — we tell you honestly which.",
      },
      {
        question: "Do I keep the rights to my book?",
        answer:
          "Always. You hold your rights from start to finish. Our services are work on your manuscript, never an acquisition of it.",
      },
      {
        question: "Can I use my own editor or designer?",
        answer:
          "Yes. Plenty of authors come to us for only part of the journey. We'll happily pick up where someone else left off.",
      },
    ],
  },
  {
    label: "For Readers",
    faqs: [
      {
        question: "How do I read a book I bought?",
        answer:
          "Everything you buy lives in your Library, ready to read in your browser — no download required. Just press Continue reading.",
      },
      {
        question: "Can I read on my phone?",
        answer:
          "Yes. The reader works on any device and remembers where you left off, so you can switch between phone and laptop freely.",
      },
      {
        question: "Can I read a sample first?",
        answer: "Every book has its full first chapter available to read free on its detail page, logged in or not.",
      },
      {
        question: "Do books expire?",
        answer: "No. A book you buy is yours to keep and re-read as often as you like.",
      },
    ],
  },
  {
    label: "Account & Billing",
    faqs: [
      {
        question: "What payment methods do you accept?",
        answer: "We accept all major cards and local payment options at checkout. Prices are shown in naira.",
      },
      {
        question: "Can I get a refund?",
        answer:
          "See our Refund Policy for the full details. In short: if something went wrong with a purchase, contact us and we will make it right.",
      },
      {
        question: "How do I change my email or password?",
        answer: "Visit your account settings from the avatar menu. You can update your details there at any time.",
      },
    ],
  },
] as const;
