"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";

/** Email + password sign-in (Credentials). Redirects to the dashboard on success
 *  and back to /signin?error=1 on bad credentials. */
export async function passwordSignInAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  if (!email || !password) redirect("/signin?error=1");
  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (err) {
    if (err instanceof AuthError) redirect("/signin?error=1");
    throw err; // let Next's redirect propagate
  }
}

/** Optional fallback: send a passwordless magic-link (Resend). */
export async function magicLinkAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  if (!email) return;
  await signIn("resend", { email, redirectTo: "/dashboard" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
