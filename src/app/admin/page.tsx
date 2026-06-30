"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopBar } from "@/components/admin/admin-top-bar";
import { CommandCenter } from "@/components/admin/views/command-center";
import { TrafficGrowth } from "@/components/admin/views/traffic-growth";
import { BookSalesView } from "@/components/admin/views/book-sales";
import { SubmissionsView } from "@/components/admin/views/submissions";
import { AuthorProjectsView } from "@/components/admin/views/author-projects";
import { NariIntelligence } from "@/components/admin/views/nari-intelligence";
import { StoryReviewQueue } from "@/components/admin/views/story-review-queue";
import { Performance } from "@/components/admin/views/performance";
import { CompetitionsView } from "@/components/admin/views/competitions";
import { ContractsView } from "@/components/admin/views/contracts";
import { CowrieEconomy } from "@/components/admin/views/cowrie-economy";
import { WithdrawalsView } from "@/components/admin/views/withdrawals";
import { UserAnalytics } from "@/components/admin/views/user-analytics";
import { AllUsers } from "@/components/admin/views/all-users";
import { SettingsView } from "@/components/admin/views/settings";
import { SkeletonKpiCard } from "@/components/admin/admin-skeleton";

type View = 
  | "command-center" | "traffic" | "book-sales" | "submissions" 
  | "author-projects" | "nari-intelligence" | "story-review" 
  | "performance" | "competitions" | "contracts" | "cowrie-economy"
  | "withdrawals" | "user-analytics" | "all-users" | "settings";

const VIEW_META: Record<View, { section: string; subsection: string; title: string }> = {
  "command-center": { section: "Overview", subsection: "", title: "Command Center" },
  "traffic": { section: "Narriva", subsection: "Analytics", title: "Traffic & Growth" },
  "book-sales": { section: "Narriva", subsection: "", title: "Book Sales" },
  "submissions": { section: "Narriva", subsection: "", title: "Manuscript Submissions" },
  "author-projects": { section: "Narriva", subsection: "", title: "Author Projects" },
  "nari-intelligence": { section: "Narriva", subsection: "", title: "Nari Intelligence" },
  "story-review": { section: "Kekere", subsection: "", title: "Story Review Queue" },
  "performance": { section: "Kekere", subsection: "", title: "Trending & Performance" },
  "competitions": { section: "Kekere", subsection: "", title: "Competitions" },
  "contracts": { section: "Kekere", subsection: "", title: "Publishing Contracts" },
  "cowrie-economy": { section: "Kekere", subsection: "", title: "Cowrie Economy" },
  "withdrawals": { section: "Kekere", subsection: "", title: "Withdrawal Requests" },
  "user-analytics": { section: "Kekere", subsection: "", title: "User Analytics" },
  "all-users": { section: "Platform", subsection: "", title: "All Users" },
  "settings": { section: "Platform", subsection: "", title: "Settings" },
};

interface DashboardData {
  kpiCards: Record<string, number>;
  pendingActionsBreakdown: Record<string, number>;
  revenueChart: { daily: Array<{ date: string; narrivaNgn: number; kekereNgn: number }> };
  userGrowthChart: { daily: Array<{ date: string; newUsers: number }> };
  activityFeed: Array<{ id: string; type: string; description: string; timestamp: string; link: string }>;
}

export default function AdminPage() {
  const [view, setView] = useState<View>("command-center");
  const [range, setRange] = useState("30d");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const meta = VIEW_META[view];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/command-center");
      if (!res.ok) throw new Error("Failed to load dashboard data");
      setData(await res.json());
    } catch (err) {
      setError((err as Error).message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pendingBreakdown = data?.pendingActionsBreakdown ?? {
    storiesAwaitingReview: 0,
    authorChangeRequests: 0,
    withdrawalsPending: 0,
    contractsUnsigned7Plus: 0,
    nariHighIntentUnread: 0,
  };

  const navCounts: Record<string, number> = {
    "submissions": 0,
    "story-review": pendingBreakdown.storiesAwaitingReview,
    "withdrawals": pendingBreakdown.withdrawalsPending,
  };

  function renderView() {
    if (loading) {
      return (
        <div className="grid grid-cols-3 gap-[14px] px-[34px] py-[30px]">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonKpiCard key={i} />)}
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-[15px] text-[#646B73]">Couldn't load dashboard data.</p>
          <button onClick={fetchData} className="mt-3 rounded-[8px] bg-[#1A1C20] px-4 py-2 text-[13px] font-medium text-white">Retry</button>
        </div>
      );
    }

    if (!data) return null;

    switch (view) {
      case "command-center": return <CommandCenter data={data} />;
      case "traffic": return <TrafficGrowth />;
      case "book-sales": return <BookSalesView />;
      case "submissions": return <SubmissionsView />;
      case "author-projects": return <AuthorProjectsView />;
      case "nari-intelligence": return <NariIntelligence />;
      case "story-review": return <StoryReviewQueue />;
      case "performance": return <Performance />;
      case "competitions": return <CompetitionsView />;
      case "contracts": return <ContractsView />;
      case "cowrie-economy": return <CowrieEconomy />;
      case "withdrawals": return <WithdrawalsView />;
      case "user-analytics": return <UserAnalytics />;
      case "all-users": return <AllUsers />;
      case "settings": return <SettingsView />;
    }
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar
        activeView={view}
        onNavigate={(key) => setView(key as View)}
        counts={navCounts}
      />
      <div className="flex-1 ml-[248px]">
        <AdminTopBar
          section={meta.section}
          subsection={meta.subsection}
          title={meta.title}
          range={range}
          onRangeChange={setRange}
        />
        {renderView()}
      </div>
    </div>
  );
}
