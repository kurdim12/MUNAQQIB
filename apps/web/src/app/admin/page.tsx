import { getSessionSafe } from "@/auth";
import { TIER_LABELS } from "@/lib/billing";
import { isAdminEmail } from "@/lib/admin";
import { formatAmmanDate } from "@/lib/format";
import { listPendingSubscriptions } from "@/lib/repo";
import { activateAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSessionSafe();
  const email = session?.user?.email;

  if (!isAdminEmail(email)) {
    return (
      <section className="py-10 text-center">
        <h1 className="text-xl font-bold text-slate-900">غير مصرّح</h1>
        <p className="mt-2 text-slate-600">
          هذه الصفحة مخصّصة لطاقم المنصّة فقط.
        </p>
        {!session && (
          <a
            href="/signin"
            className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark"
          >
            تسجيل الدخول
          </a>
        )}
      </section>
    );
  }

  const pending = await listPendingSubscriptions();

  return (
    <section>
      <h1 className="text-2xl font-bold text-slate-900">تأكيد المدفوعات (كليك)</h1>
      <p className="mt-1 text-slate-600">
        طلبات الترقية بانتظار تأكيد التحويل عبر كليك. فعّل الاشتراك بعد استلام الدفعة.
      </p>

      {pending.length === 0 ? (
        <p className="mt-8 rounded-lg border border-slate-200 bg-white px-4 py-10 text-center text-slate-500">
          لا توجد طلبات معلّقة.
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">المنشأة</th>
                <th className="px-4 py-3 font-medium">الخطة</th>
                <th className="px-4 py-3 font-medium">المرجع</th>
                <th className="px-4 py-3 font-medium">تاريخ الطلب</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pending.map((p) => (
                <tr key={p.org_id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{p.org_name}</div>
                    <div className="text-xs text-slate-400" dir="ltr">
                      {p.digest_emails[0] ?? "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">{TIER_LABELS[p.tier]}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {p.cliq_reference ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatAmmanDate(p.requested_at)}
                  </td>
                  <td className="px-4 py-3">
                    <form action={activateAction}>
                      <input type="hidden" name="orgId" value={p.org_id} />
                      <button
                        type="submit"
                        className="rounded-md bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-dark"
                      >
                        تفعيل
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
