export interface HelpFAQItem {
  question: string;
  answer: string;
}

export interface HelpCategory {
  label: string;
  faqs: readonly HelpFAQItem[];
}

export const HELP_CATEGORIES: readonly HelpCategory[] = [
  {
    label: "For Readers",
    faqs: [
      {
        question: "What are cowries?",
        answer:
          "Cowries are how you unlock stories on Kekere. Each story costs a few cowries, and that goes straight to supporting the writer. Top up any time from your wallet.",
      },
      {
        question: "How long are the stories?",
        answer:
          "Short — most take between two and ten minutes to read. They're made for real life: a commute, a queue, the time before sleep.",
      },
      {
        question: "Can I read offline?",
        answer:
          "Not yet — Kekere runs in your browser for now, so you'll need a connection to read. But every story you unlock stays in your library and remembers where you left off, so it's always one tap away when you're back online.",
      },
      {
        question: "What does the completion rate mean?",
        answer:
          "When you see '91% finish this,' it means most readers who start the story read it all the way through. It's a small honest signal of how gripping a story is.",
      },
    ],
  },
  {
    label: "For Writers",
    faqs: [
      {
        question: "How do I publish a story?",
        answer:
          "Open the writer's editor, write your story, and submit for review. We read everything that comes in, properly, within five to seven business days, and let you know once it's ready to go live.",
      },
      {
        question: "How do I earn from my writing?",
        answer:
          "When readers unlock your story with cowries, a share goes to you. The more readers finish and share, the more your story travels.",
      },
    ],
  },
  {
    label: "Cowries & Wallet",
    faqs: [
      {
        question: "How do I top up?",
        answer:
          "Go to your wallet, tap Top up, choose a package, and pay with Paystack. Cowries are added instantly, and bigger packages come with bonus cowries.",
      },
      {
        question: "Do cowries expire?",
        answer: "No. Cowries in your wallet stay there until you spend them.",
      },
      {
        question: "Can I get a refund?",
        answer:
          "If something went wrong with a payment, message the team and we'll sort it out.",
      },
    ],
  },
  {
    label: "Account",
    faqs: [
      {
        question: "How do I change my details?",
        answer:
          "Open your profile and tap Edit profile to update your name, photo, and bio.",
      },
      {
        question: "How do I delete my account?",
        answer:
          "Message the team and we'll help you remove your account and data. No hoops.",
      },
    ],
  },
];
