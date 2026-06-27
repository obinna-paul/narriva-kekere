"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface UnlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyTitle: string;
  cowrieCost: number;
  balance: number;
  onUnlock: () => void;
}

export function UnlockModal({
  open,
  onOpenChange,
  storyTitle,
  cowrieCost,
  balance,
  onUnlock,
}: UnlockModalProps) {
  const canAfford = balance >= cowrieCost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.18 }}
        >
          <DialogHeader>
            <DialogTitle>Unlock &quot;{storyTitle}&quot;</DialogTitle>
            <DialogDescription>
              This story costs {cowrieCost} cowries to read in full.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between rounded-lg bg-[var(--color-primary-muted)] px-4 py-3">
            <span className="text-sm text-[var(--color-ink)]/70">Your balance</span>
            <span className="font-semibold text-[var(--color-primary)]">{balance} cowries</span>
          </div>

          {!canAfford && (
            <p className="mt-3 text-sm text-red-600">
              You don&apos;t have enough cowries for this one yet.
            </p>
          )}

          <DialogFooter>
            {canAfford ? (
              <Button onClick={onUnlock}>Unlock for {cowrieCost} cowries</Button>
            ) : (
              <Link
                href="/kekere/wallet"
                className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--color-primary)] px-5 font-medium text-[var(--color-bg)] hover:bg-[var(--color-primary-light)]"
              >
                Top up
              </Link>
            )}
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
