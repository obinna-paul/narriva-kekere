export interface MockWalletTransaction {
  id: string;
  type: "TOP_UP" | "UNLOCK";
  amountCowries: number;
  amountNgn?: number;
  description: string;
  date: string;
}

export const MOCK_WALLET_BALANCE = 340;

export const MOCK_WALLET_TRANSACTIONS: readonly MockWalletTransaction[] = [
  {
    id: "tx-1",
    type: "TOP_UP",
    amountCowries: 210,
    amountNgn: 1000,
    description: "Top-up",
    date: "2026-06-19",
  },
  {
    id: "tx-2",
    type: "UNLOCK",
    amountCowries: -45,
    description: "Unlocked \"What the Okada Driver Saw\"",
    date: "2026-06-17",
  },
  {
    id: "tx-3",
    type: "UNLOCK",
    amountCowries: -18,
    description: "Unlocked \"Love, Logged Off\"",
    date: "2026-06-09",
  },
  {
    id: "tx-4",
    type: "TOP_UP",
    amountCowries: 550,
    amountNgn: 2500,
    description: "Top-up",
    date: "2026-05-28",
  },
  {
    id: "tx-5",
    type: "UNLOCK",
    amountCowries: -55,
    description: "Unlocked \"The Wig Shop on Allen Avenue\"",
    date: "2026-04-29",
  },
  {
    id: "tx-6",
    type: "UNLOCK",
    amountCowries: -25,
    description: "Unlocked \"Aunty Ngozi's Last Wedding\"",
    date: "2026-02-15",
  },
];

export interface MockProfile {
  name: string;
  email: string;
  bio: string;
  avatarColor: string;
  isWriter: boolean;
  writingStats: {
    publishedCount: number;
    totalReads: number;
    cowriesEarned: number;
  };
  readingStats: {
    storiesRead: number;
    savedCount: number;
  };
}

export const MOCK_PROFILE: MockProfile = {
  name: "Halima Yusuf",
  email: "reader@example.com",
  bio: "Reads on the bus, writes after midnight. Currently three chapters into something I'm not ready to talk about yet.",
  avatarColor: "#C75D2C",
  isWriter: true,
  writingStats: {
    publishedCount: 2,
    totalReads: 1840,
    cowriesEarned: 612,
  },
  readingStats: {
    storiesRead: 47,
    savedCount: 9,
  },
};

export const MOCK_SAVED_STORY_IDS = [
  "her-mothers-tongue",
  "lagos-4am",
  "what-we-buried-in-bonny",
  "salt-for-the-sea-widow",
] as const;

export const MOCK_UNLOCKED_STORY_IDS = [
  "what-the-okada-driver-saw",
  "love-logged-off",
  "the-wig-shop-on-allen-avenue",
  "aunty-ngozis-last-wedding",
] as const;

export interface MockHistoryEntry {
  storyId: string;
  readAt: string;
}

export const MOCK_READING_HISTORY: readonly MockHistoryEntry[] = [
  { storyId: "the-interview", readAt: "2026-06-20" },
  { storyId: "the-generator-diaries", readAt: "2026-06-19" },
  { storyId: "love-logged-off", readAt: "2026-06-09" },
  { storyId: "what-the-okada-driver-saw", readAt: "2026-06-17" },
  { storyId: "jollof-wars", readAt: "2026-05-03" },
];
