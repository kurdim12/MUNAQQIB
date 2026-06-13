"use server";

import { revalidatePath } from "next/cache";

import { isOppStatus } from "@/lib/opportunity";
import {
  enqueueAnalysis,
  getCurrentOrgId,
  transitionOpportunity,
} from "@/lib/repo";

/** Queue a document-intelligence job for a tender (Layer 11 producer). */
export async function requestAnalysisAction(tenderId: string) {
  const orgId = await getCurrentOrgId();
  if (!orgId) return;
  await enqueueAnalysis(orgId, tenderId);
  revalidatePath(`/tenders/${tenderId}`);
}

/** Move an opportunity through its lifecycle (Layer 2). The repo enforces the
 *  legal transition; we revalidate every surface that shows the stage. */
export async function transitionOpportunityAction(tenderId: string, to: string) {
  if (!isOppStatus(to)) return;
  const orgId = await getCurrentOrgId();
  if (!orgId) return;
  await transitionOpportunity(orgId, tenderId, to);
  revalidatePath(`/tenders/${tenderId}`);
  revalidatePath("/dashboard");
  revalidatePath("/watchlist");
}
