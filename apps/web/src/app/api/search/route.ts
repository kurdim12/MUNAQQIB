import { NextResponse } from "next/server";

import { getCurrentOrgId, getMatchedTenders, isConfigured } from "@/lib/repo";

export const dynamic = "force-dynamic";

/** Feeds the ⌘K command palette: the org's matched opportunities (lightweight). */
export async function GET() {
  if (!isConfigured()) return NextResponse.json({ tenders: [] });
  const orgId = await getCurrentOrgId();
  const tenders = orgId ? await getMatchedTenders(orgId, {}) : [];
  return NextResponse.json({
    tenders: tenders.map((t) => ({
      id: t.tender_id,
      title: t.title,
      entity: t.entity,
      category: t.category,
    })),
  });
}
