// app/_lib/validations/email.ts
import { z } from "zod";

export const contactListSchema = z.object({
  name: z.string().min(1, "List name is required").max(100),
  description: z.string().max(500).optional(),
  emails: z.array(z.string().email()).min(1, "At least one email is required"),
  domainId: z.string().min(1, "Domain is required"),
  contacts: z
    .array(
      z.object({
        email: z.string().email(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        company: z.string().optional(),
        phone: z.string().optional(),
      }),
    )
    .optional(),
});

export const emailComposeSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(998, "Subject is too long"),
  body: z.string().min(1, "Email body is required"),
  // Multi-list: accepts an array of contact list IDs (1–10 lists)
  contactListIds: z
    .array(z.string().min(1))
    .min(1, "At least one contact list is required")
    .max(10, "Maximum 10 contact lists per campaign"),
  senderId: z.string().min(1, "Sender is required"),
  preheader: z.string().max(200, "Preheader is too long").optional(),
  // "transactional" = Mailchimp Transactional (Mandrill), one send per contact
  // "marketing" = Mailchimp Marketing campaign against a synced audience
  sendMethod: z.enum(["transactional", "marketing"]).default("transactional"),
});
export const bulkEmailInputSchema = z.object({
  emails: z.string().min(1, "Please enter email addresses"),
});

export type ContactListFormData = z.infer<typeof contactListSchema>;
export type EmailComposeFormData = z.infer<typeof emailComposeSchema>;
export type BulkEmailInputData = z.infer<typeof bulkEmailInputSchema>;


// app/_lib/validations/email.ts


export type EmailComposeInput = z.infer<typeof emailComposeSchema>;
