import { render } from "@react-email/render";
import { createElement } from "react";
import { OtpEmail } from "./otp";
import { WelcomeEmail } from "./welcome";
import { StoryAcceptedEmail } from "./story-accepted";
import { ContractSignedEmail } from "./contract-signed";
import { StoryRejectedEmail } from "./story-rejected";
import { RevisionsRequestedEmail } from "./revisions-requested";

export async function renderOtpEmail(props: { name: string; otp: string; expiryMinutes?: number }) {
  return render(createElement(OtpEmail, props));
}

export async function renderWelcomeEmail(props: { name: string; appUrl?: string }) {
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
