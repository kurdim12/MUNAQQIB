import { getSessionSafe } from "@/auth";
import { Field, SettingsForm } from "@/components/SettingsForm";
import { TIER_LABELS } from "@/lib/billing";
import {
  getCurrentOrgId,
  getOrg,
  getOrgMembers,
  getSubscription,
  isConfigured,
  type Org,
} from "@/lib/repo";
import { signOutAction, updateDeliveryAction, updateProfileAction } from "./actions";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "profile", label: "الملف" },
  { id: "delivery", label: "التوصيل" },
  { id: "team", label: "الفريق" },
  { id: "account", label: "الحساب" },
] as const;

const SEATS: Record<string, number> = { trial: 1, radar: 1, pro: 3, intelligence: 10 };
const inputCls =
  "w-full rounded-xl border border-line px-4 py-2.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const tab = (await searchParams)?.tab ?? "profile";
  const session = await getSessionSafe();
  const orgId = isConfigured() ? await getCurrentOrgId() : null;
  const org = orgId ? await getOrg(orgId) : null;
  const sub = orgId ? await getSubscription(orgId) : null;
  const members = orgId ? await getOrgMembers(orgId) : [];

  return (
    <section className="animate-fade-in">
      <header className="mb-6">
        <p className="eyebrow">المنطقة ③ · التشغيل</p>
        <h1 className="mt-2 text-3xl font-extrabold text-ink sm:text-4xl">الإعدادات</h1>
        <p className="mt-1.5 text-ink-soft">
          ملف شركتك هو المحرّك الذي يصنع الفرص — كل تعديل يعيد ضبط المطابقة.
        </p>
      </header>

      <div className="flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <a
            key={t.id}
            href={`/settings?tab=${t.id}`}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === t.id
                ? "border-primary text-ink"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      <div className="mt-7 max-w-2xl">
        {!org ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            لا يوجد ملف شركة بعد — أكمِل التعريف أولاً.
          </p>
        ) : tab === "profile" ? (
          <ProfileTab org={org} />
        ) : tab === "delivery" ? (
          <DeliveryTab org={org} />
        ) : tab === "team" ? (
          <TeamTab members={members} tier={sub?.tier ?? "trial"} />
        ) : (
          <AccountTab email={session?.user?.email ?? null} />
        )}
      </div>
    </section>
  );
}

function ProfileTab({ org }: { org: Org }) {
  return (
    <SettingsForm
      action={updateProfileAction}
      submitLabel="حفظ الملف"
      successText="تم الحفظ — سنحدّث مطابقتك في الإحاطة القادمة."
    >
      <Field label="اسم الشركة">
        <input name="name" defaultValue={org.name} required className={inputCls} />
      </Field>
      <Field label="القطاع">
        <select name="sector" defaultValue={org.sector} className={inputCls}>
          <option value="contracting">مقاولات</option>
          <option value="supplies">توريدات / لوازم</option>
          <option value="consulting">استشارات</option>
          <option value="services">خدمات</option>
        </select>
      </Field>
      <Field label="حقول التصنيف" hint="افصل بينها بفاصلة — مثال: طرق وجسور، سدود، أعمال مدنية">
        <textarea name="classification_fields" defaultValue={org.classification_fields.join("، ")} rows={2} className={inputCls} />
      </Field>
      <Field label="الفئة (التصنيف)" hint="١ = الأعلى. اتركها فارغة إن لم تنطبق.">
        <input name="classification_grade" type="number" min={1} max={6} defaultValue={org.classification_grade ?? ""} className={inputCls} dir="ltr" />
      </Field>
      <Field label="فئات التوريد" hint="للموردين — افصل بفاصلة">
        <textarea name="supply_categories" defaultValue={org.supply_categories.join("، ")} rows={2} className={inputCls} />
      </Field>
      <Field label="المحافظات المستهدفة" hint="اتركها فارغة = كل المحافظات">
        <input name="governorates" defaultValue={org.governorates.join("، ")} className={inputCls} />
      </Field>
      <Field label="كلمات مفتاحية للتضمين" hint="عطاءات تحوي هذه الكلمات تُرفع أولويتها">
        <input name="include_keywords" defaultValue={org.include_keywords.join("، ")} className={inputCls} />
      </Field>
      <Field label="كلمات للاستثناء" hint="عطاءات تحوي هذه الكلمات تُستبعد">
        <input name="exclude_keywords" defaultValue={org.exclude_keywords.join("، ")} className={inputCls} />
      </Field>
    </SettingsForm>
  );
}

function DeliveryTab({ org }: { org: Org }) {
  return (
    <div className="space-y-6">
      <SettingsForm action={updateDeliveryAction} submitLabel="حفظ عناوين التوصيل" successText="تم حفظ عناوين الإحاطة.">
        <Field label="بريد الإحاطة الصباحية" hint="افصل بين العناوين بفاصلة. تصل الإحاطة لكل عنوان.">
          <input name="digest_emails" defaultValue={org.digest_emails.join("، ")} dir="ltr" className={inputCls} />
        </Field>
      </SettingsForm>
      <div className="panel p-5 text-sm text-ink-soft">
        <p><span className="font-semibold text-ink">وقت الإرسال:</span> ٧:٣٠ صباحاً بتوقيت عمّان، يومياً.</p>
        <p className="mt-2"><span className="font-semibold text-ink">تنبيهات تيليجرام:</span> تُربط لاحقاً بنقرة واحدة لتنبيهات المواعيد الحرجة.</p>
      </div>
    </div>
  );
}

function TeamTab({ members, tier }: { members: { user_id: string; email: string | null; role: string }[]; tier: string }) {
  const seats = SEATS[tier] ?? 1;
  return (
    <div className="space-y-5">
      <div className="panel divide-y divide-line">
        {members.length === 0 ? (
          <p className="p-5 text-sm text-ink-muted">لا أعضاء بعد.</p>
        ) : (
          members.map((m) => (
            <div key={m.user_id} className="flex items-center justify-between p-4">
              <span dir="ltr" className="text-sm text-ink">{m.email ?? m.user_id}</span>
              <span className="chip">{m.role === "owner" ? "المالك" : "عضو"}</span>
            </div>
          ))
        )}
      </div>
      <p className="text-sm text-ink-muted">
        خطتك ({TIER_LABELS[tier as keyof typeof TIER_LABELS] ?? "تجريبية"}) تتيح {seats}{" "}
        {seats === 1 ? "مستخدماً" : "مستخدمين"}. دعوة الأعضاء بالبريد تُتاح قريباً —
        {tier !== "intelligence" && <a href="/pricing" className="font-semibold text-primary-700"> رقِّ خطتك لمزيد من المقاعد</a>}.
      </p>
    </div>
  );
}

function AccountTab({ email }: { email: string | null }) {
  return (
    <div className="space-y-5">
      <div className="panel p-5">
        <p className="text-sm text-ink-muted">البريد الإلكتروني</p>
        <p dir="ltr" className="mt-1 text-ink">{email ?? "—"}</p>
      </div>
      <form action={signOutAction}>
        <button type="submit" className="btn-outline text-sm">تسجيل الخروج</button>
      </form>
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <p className="font-semibold text-red-700">منطقة الحذف</p>
        <p className="mt-1 text-sm text-red-700/80">
          حذف الحساب يوقف الإحاطة ويزيل بياناتك. تواصل معنا لتنفيذ الحذف.
        </p>
      </div>
    </div>
  );
}
