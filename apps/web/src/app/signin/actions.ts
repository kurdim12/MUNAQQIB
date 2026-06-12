"use server";

import { signIn, signOut } from "@/auth";

/** Send a passwordless magic-link to the submitted email (Resend). */
export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  if (!email) return;
  // Redirects to Auth.js's "check your email" page on success.
  await signIn("resend", { email, redirectTo: "/dashboard" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
