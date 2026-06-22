import { z } from "zod";

const ACCEPTED_MANUSCRIPT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // legacy .doc
];

export const submissionFormSchema = z.object({
  authorName: z.string().min(1, "Your name is required").max(200),
  authorEmail: z.string().email("Enter a valid email address"),
  manuscriptTitle: z.string().min(1, "Manuscript title is required").max(300),
  synopsis: z.string().min(1, "A short synopsis is required").max(5000),
  targetAudience: z.string().min(1, "Tell us who this is for").max(1000),
  guidelinesAccepted: z.literal(true, {
    message: "You must confirm you've read the submission guidelines",
  }),
});

export type SubmissionFormValues = z.infer<typeof submissionFormSchema>;

export const manuscriptFileSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "A manuscript file is required")
  .refine((file) => file.size <= 25 * 1024 * 1024, "File must be 25MB or smaller")
  .refine(
    (file) => ACCEPTED_MANUSCRIPT_TYPES.includes(file.type),
    "Manuscript must be a PDF or Word document (.pdf, .docx, .doc)"
  );
