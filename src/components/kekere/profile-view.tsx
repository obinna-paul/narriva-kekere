"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ProfileCard } from "@/components/kekere/profile-card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";

type StoryStatus = "DRAFT" | "SUBMITTED" | "REVIEWING" | "REVISIONS_REQUESTED" | "PUBLISHED" | "REJECTED";

export interface MyStorySummary {
  id: string;
  title: string;
  status: StoryStatus;
}

const STATUS_STYLES: Record<StoryStatus, string> = {
  DRAFT: "bg-[var(--color-ink)]/10 text-[var(--color-ink)]/70",
  SUBMITTED: "bg-amber-100 text-amber-800",
  REVIEWING: "bg-amber-100 text-amber-800",
  REVISIONS_REQUESTED: "bg-orange-100 text-orange-800",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<StoryStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  REVIEWING: "In review",
  REVISIONS_REQUESTED: "Revisions requested",
  PUBLISHED: "Published",
  REJECTED: "Not accepted",
};

const EDITABLE_STATUSES: StoryStatus[] = ["DRAFT", "REVISIONS_REQUESTED"];

function StatGrid({ stats }: { stats: { label: string; value: string | number }[] }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-xl bg-[var(--color-ink)]/[0.04] p-3 text-center">
          <p className="text-lg font-bold">{stat.value}</p>
          <p className="text-xs text-[var(--color-ink)]/50">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

export interface ProfileViewProps {
  name: string;
  email: string;
  bio: string;
  avatarColor: string;
  hasAuthoredAnyStory: boolean;
  writingStats: { publishedCount: number; totalReads: number; cowriesEarned: number };
  readingStats: { storiesRead: number; savedCount: number };
  myStories: readonly MyStorySummary[];
}

export function ProfileView(props: ProfileViewProps) {
  const [name, setName] = useState(props.name);
  const [bio, setBio] = useState(props.bio);
  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftBio, setDraftBio] = useState(bio);

  function openEdit() {
    setDraftName(name);
    setDraftBio(bio);
    setEditOpen(true);
  }

  function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    // Doesn't persist yet — no PATCH /api/kekere/profile endpoint exists in
    // this phase's scope (only the reading-side APIs were in scope).
    setName(draftName);
    setBio(draftBio);
    setEditOpen(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-28 sm:px-8 md:pb-12">
      <ProfileCard
        profile={{
          name,
          email: props.email,
          bio,
          avatarColor: props.avatarColor,
          isWriter: props.hasAuthoredAnyStory,
          writingStats: props.writingStats,
          readingStats: props.readingStats,
        }}
        onEditClick={openEdit}
      />

      {props.hasAuthoredAnyStory && (
        <section className="mt-8">
          <h2 className="text-lg font-bold">Writing</h2>
          <div className="mt-3">
            <StatGrid
              stats={[
                { label: "Published", value: props.writingStats.publishedCount },
                { label: "Total reads", value: props.writingStats.totalReads },
                { label: "Cowries earned", value: props.writingStats.cowriesEarned },
              ]}
            />
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {props.myStories.map((story) => {
              const href = EDITABLE_STATUSES.includes(story.status)
                ? `/kekere/write?id=${story.id}`
                : `/kekere/story/${story.id}`;
              return (
                <Link
                  key={story.id}
                  href={href}
                  className="flex items-center justify-between rounded-xl border border-[var(--color-ink)]/10 px-4 py-3"
                >
                  <span className="font-medium">{story.title || "Untitled story"}</span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide",
                      STATUS_STYLES[story.status]
                    )}
                  >
                    {STATUS_LABELS[story.status]}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-bold">Reading</h2>
        <div className="mt-3">
          <StatGrid
            stats={[
              { label: "Stories read", value: props.readingStats.storiesRead },
              { label: "Saved", value: props.readingStats.savedCount },
            ]}
          />
        </div>
      </section>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
          >
            <DialogHeader>
              <DialogTitle>Edit profile</DialogTitle>
            </DialogHeader>
            <form onSubmit={saveEdit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" rows={3} value={draftBio} onChange={(e) => setDraftBio(e.target.value)} />
              </div>
              <DialogFooter>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </motion.div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
