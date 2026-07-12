import { render } from "@react-email/render";
import { createElement } from "react";
import { OtpEmail } from "./otp";
import { WelcomeEmail } from "./welcome";
import { StoryAcceptedEmail } from "./story-accepted";
import { ContractSignedEmail } from "./contract-signed";
import { StoryRejectedEmail } from "./story-rejected";
import { RevisionsRequestedEmail } from "./revisions-requested";
import { ResetPasswordEmail } from "./reset-password";
import { PublishingAgreementEmail } from "./publishing-agreement";
import { WalletHistoryEmail, type WalletHistoryRow } from "./wallet-history";
import { NoticeEmail } from "./notice";
import { SITE_URL } from "@/content/decisions";

export async function renderOtpEmail(props: { name: string; otp: string; expiryMinutes?: number }) {
  return render(createElement(OtpEmail, props));
}

export async function renderWelcomeEmail(props: { name: string }) {
  return render(createElement(WelcomeEmail, props));
}

export async function renderStoryAcceptedEmail(props: {
  writerName: string;
  storyTitle: string;
  cowrieCost: number;
  writerSharePercent?: number;
  expiresInDays: number;
  contractUrl?: string;
}) {
  return render(createElement(StoryAcceptedEmail, props));
}

export async function renderContractSignedEmail(props: {
  writerName: string;
  storyTitle: string;
  signedAt: string;
  storyUrl?: string;
  pdfAttached?: boolean;
}) {
  return render(createElement(ContractSignedEmail, props));
}

export async function renderStoryRejectedEmail(props: {
  writerName: string;
  storyTitle: string;
  editorFeedback: string;
}) {
  return render(createElement(StoryRejectedEmail, props));
}

export async function renderRevisionsRequestedEmail(props: {
  writerName: string;
  storyTitle: string;
  editorNotes: string;
  storyId: string;
  editorUrl?: string;
}) {
  return render(createElement(RevisionsRequestedEmail, props));
}

export async function renderResetPasswordEmail(props: {
  name: string;
  resetUrl: string;
  expiryMinutes?: number;
}) {
  return render(createElement(ResetPasswordEmail, props));
}

export async function renderPublishingAgreementEmail(props: {
  writerName: string;
  storyTitle: string;
  claimUrl: string;
}) {
  return render(createElement(PublishingAgreementEmail, props));
}

export async function renderWalletHistoryEmail(props: {
  name: string;
  from: string;
  to: string;
  rows: WalletHistoryRow[];
}) {
  return render(createElement(WalletHistoryEmail, props));
}

export async function renderReferralRewardEmail(props: {
  referrerName: string;
  reward: number;
  inviteeName: string;
}) {
  const { referrerName, reward, inviteeName } = props;
  return render(
    createElement(NoticeEmail, {
      preview: `You earned ${reward} cowries!`,
      heading: "You earned a referral reward",
      lines: [
        `Hi ${referrerName},`,
        `${inviteeName} joined Kekere Stories with your referral link and just bought cowries for the first time — so you've earned ${reward} cowrie${reward !== 1 ? "s" : ""}! Your balance has already been updated.`,
        "Keep sharing your link — every friend who joins and tops up earns you more.",
      ],
      highlight: { label: "Reward earned", rows: [`+${reward} cowries`], tone: "positive" },
      cta: { label: "View your wallet", url: `${SITE_URL}/kekere/wallet` },
    }),
  );
}

export async function renderStoryUnpublishedEmail(props: {
  writerName: string;
  storyTitle: string;
  reason: string;
}) {
  const { writerName, storyTitle, reason } = props;
  return render(
    createElement(NoticeEmail, {
      preview: `"${storyTitle}" has been unpublished from Kekere Stories`,
      heading: "Your story has been unpublished",
      lines: [
        `Hi ${writerName},`,
        `Your story "${storyTitle}" has been unpublished from Kekere Stories. It's now back in draft status — readers who previously unlocked it retain access, and you're welcome to edit and resubmit it for review.`,
      ],
      highlight: { label: "Reason", rows: [reason] },
    }),
  );
}

export async function renderContractOfferEmail(props: {
  writerName: string;
  contractUrl: string;
}) {
  const { writerName, contractUrl } = props;
  return render(
    createElement(NoticeEmail, {
      preview: "You have a publishing contract from Kekere Stories",
      heading: "You have a publishing contract",
      lines: [
        `Hi ${writerName},`,
        "A publishing contract has been sent to you. Please review it and sign with one tap — it's waiting for you in your Kekere Stories profile.",
      ],
      cta: { label: "Review & sign your contract →", url: contractUrl },
    }),
  );
}

export async function renderContractReminderEmail(props: {
  writerName: string;
  sentDate: string;
  contractUrl: string;
}) {
  const { writerName, sentDate, contractUrl } = props;
  return render(
    createElement(NoticeEmail, {
      preview: "Reminder: you have a publishing contract from Kekere Stories",
      heading: "Your contract is still waiting",
      lines: [
        `Hi ${writerName},`,
        `A publishing contract has been waiting for your review since ${sentDate}. Please sign it before it expires — it only takes a moment.`,
        `If you have questions, reply to this email or contact ${SITE_URL.replace("https://", "")}.`,
      ],
      cta: { label: "Review & sign your contract →", url: contractUrl },
    }),
  );
}

export async function renderWithdrawalProcessingEmail(props: {
  writerName: string;
  cowries: number;
  ngnAmount: number;
}) {
  const { writerName, cowries, ngnAmount } = props;
  return render(
    createElement(NoticeEmail, {
      preview: "Your withdrawal is being processed",
      heading: "Your withdrawal is on its way",
      lines: [
        `Hi ${writerName},`,
        "Your withdrawal request has been approved and is being processed. It should arrive in your bank account shortly.",
      ],
      highlight: {
        label: "Withdrawal approved",
        rows: [`${cowries} cowries`, `₦${ngnAmount.toLocaleString("en-NG")}`],
        tone: "positive",
      },
      cta: { label: "View your wallet", url: `${SITE_URL}/kekere/wallet` },
    }),
  );
}

export async function renderWithdrawalRejectedEmail(props: {
  writerName: string;
  cowries: number;
  reason: string;
}) {
  const { writerName, cowries, reason } = props;
  return render(
    createElement(NoticeEmail, {
      preview: "Your withdrawal request was not approved",
      heading: "Your withdrawal wasn't approved",
      lines: [
        `Hi ${writerName},`,
        `Your withdrawal request for ${cowries} cowries was not approved. Your earned balance has been restored — the cowries are back in your wallet, and you're welcome to submit a new request.`,
      ],
      highlight: { label: "Reason", rows: [reason] },
      cta: { label: "View your wallet", url: `${SITE_URL}/kekere/wallet` },
    }),
  );
}

export async function renderWithdrawalCompletedEmail(props: {
  writerName: string;
  cowries: number;
  ngnAmount: number;
  reference: string;
}) {
  const { writerName, cowries, ngnAmount, reference } = props;
  return render(
    createElement(NoticeEmail, {
      preview: "Your withdrawal has been completed",
      heading: "Your withdrawal is complete",
      lines: [
        `Hi ${writerName},`,
        "Your withdrawal has been completed and should arrive in your bank account within 24 hours.",
      ],
      highlight: {
        label: "Sent to your bank",
        rows: [`${cowries} cowries (₦${ngnAmount.toLocaleString("en-NG")})`, `Reference: ${reference}`],
        tone: "positive",
      },
      cta: { label: "View your wallet", url: `${SITE_URL}/kekere/wallet` },
    }),
  );
}

export async function renderWithdrawalFailedEmail(props: {
  writerName: string;
  cowries: number;
}) {
  const { writerName, cowries } = props;
  return render(
    createElement(NoticeEmail, {
      preview: "Your withdrawal could not be processed",
      heading: "Your withdrawal couldn't be processed",
      lines: [
        `Hi ${writerName},`,
        `Your withdrawal of ${cowries} cowries could not be processed. Your balance has been restored — please try again, or contact us if it keeps happening.`,
      ],
      cta: { label: "View your wallet", url: `${SITE_URL}/kekere/wallet` },
    }),
  );
}
