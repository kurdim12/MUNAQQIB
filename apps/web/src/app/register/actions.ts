"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";

import { signIn } from "@/auth";
import { hashPassword } from "@/lib/password";
import {
  createCredentialUser,
  createOrgWithTrial,
  emailExists,
} from "@/lib/repo";

const schema = z.object({
  company: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(8),
  sector: z.enum(["contracting", "supplies", "consulting", "services"]),
});

/** Register a company: create the credentials user, an org + 14-day trial, link
 *  the user as owner, then sign them in. Errors come back via /register?error=. */
export async function registerAction(formData: FormData) {
  const parsed = schema.safeParse({
    company: formData.get("company"),
    email: formData.get("email"),
    password: formData.get("password"),
    sector: formData.get("sector"),
  });
  if (!parsed.success) redirect("/register?error=invalid");

  const { company, email, password, sector } = parsed.data;

  if (await emailExists(email)) redirect("/register?error=exists");

  let userId: string;
  try {
    userId = await createCredentialUser(email, hashPassword(password), company);
    await createOrgWithTrial(
      {
        name: company,
        sector,
        classification_fields: [],
        classification_grade: null,
        governorates: [],
        include_keywords: [],
        exclude_keywords: [],
        digest_emails: [email.toLowerCase()],
      },
      userId,
    );
  } catch {
    redirect("/register?error=server");
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (err) {
    if (err instanceof AuthError) redirect("/signin");
    throw err; // propagate Next's redirect
  }
}
