export interface TeamMember {
  name: string;
  role: string;
  bio: string;
}

export const NARRIVA_TEAM: readonly TeamMember[] = [
  {
    name: "Adaeze Okonkwo",
    role: "Founder & Publisher",
    bio: "Spent a decade in journalism and trade publishing before starting Narriva. Reads every submission that comes in.",
  },
  {
    name: "Tobi Williams",
    role: "Editorial Director",
    bio: "Developmental editor with a soft spot for difficult second novels and a refusal to let a weak chapter slide.",
  },
  {
    name: "Ireti Bankole",
    role: "Design Lead",
    bio: "Cover and interior designer. Believes a book should look as considered as it reads, all the way to the colophon.",
  },
  {
    name: "Segun Afolabi",
    role: "Production Manager",
    bio: "Handles ISBNs, print-ready files, and the unglamorous machinery that turns a finished manuscript into a real object.",
  },
  {
    name: "Hauwa Idris",
    role: "Author Growth",
    bio: "Plans launches and builds readerships. Stays in the author's corner long after the book has shipped.",
  },
  {
    name: "Chinwe Obi",
    role: "Managing Editor",
    bio: "Keeps every book moving and every author informed. The person who actually knows what day it is.",
  },
] as const;
