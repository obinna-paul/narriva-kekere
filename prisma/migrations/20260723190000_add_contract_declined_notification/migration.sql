-- Notify a writer in-app when they decline a publishing contract, so they know their story is fully theirs again.
ALTER TYPE "NotificationType" ADD VALUE 'CONTRACT_DECLINED';
