import { z } from "zod";

export const CONTACT_SUBJECTS = [
  "General enquiry",
  "Discovery call request",
  "Support",
  "Press",
] as const;

export const contactFormSchema = z.object({
  name: z.string().min(1, "Enter your name").max(200),
  email: z.string().email("Enter a valid email address"),
  subject: z.enum(CONTACT_SUBJECTS),
  message: z.string().min(1, "Enter a message").max(5000),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;
