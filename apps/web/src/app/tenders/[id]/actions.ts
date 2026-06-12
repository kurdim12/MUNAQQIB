"use server";

import { revalidatePath } from "next/cache";

import { enqueueAnalysis, getCurrentOrgId } from "@/lib/repo";

/** Queue a document-intelligence job for a tender (Layer 11 producer). */
export async function requestAnalysisAction(tenderId: string) {
  const orgId = await getCurrentOrgId();
  if (!orgId) return;
  await enqueueAnalysis(orgId, tenderId);
  revalidatePath(`/tenders/${tenderId}`);
}
