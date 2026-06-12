"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Item = { kind: "nav" | "cat" | "opp"; label: string; sub?: string; href: string };
type Tender = { id: string; title: string; entity: string | null; category: string | null };

const NAV: Item[] = [
  { kind: "nav", label: "مركز القيادة", sub: "الفرص ذات الأولوية", href: "/dashboard" },
  { kind: "nav", label: "ذكاء السوق", sub: "أبرز الجهات والقطاعات", href: "/intelligence" },
  { kind: "nav", label: "المتابعة", sub: "الفرص المحفوظة", href: "/dashboard?view=saved" },
  { kind: "nav", label: "الأسعار والخطط", href: "/pricing" },
];

const KIND_LABEL: Record<Item["kind"], string> = {
  nav: "التنقّل",
  cat: "القطاعات",
  opp: "الفرص",
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Open with ⌘K / Ctrl+K from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lazy-load the searchable opportunities the first time it opens.
  useEffect(() => {
    if (open && !loaded) {
      fetch("/api/search")
        .then((r) => r.json())
        .then((d) => setTenders(d.tenders ?? []))
        .catch(() => setTenders([]))
        .finally(() => setLoaded(true));
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    if (!open) {
      setQ("");
      setActive(0);
    }
  }, [open, loaded]);

  const results = useMemo<Item[]>(() => {
    const query = q.trim();
    const cats = Array.from(new Set(tenders.map((t) => t.category).filter(Boolean))) as string[];
    const catItems: Item[] = cats.map((c) => ({
      kind: "cat",
      label: c,
      sub: "تصفية الفرص",
      href: `/dashboard?cat=${encodeURIComponent(c)}`,
    }));
    const oppItems: Item[] = tenders.map((t) => ({
      kind: "opp",
      label: t.title,
      sub: t.entity ?? undefined,
      href: `/tenders/${t.id}`,
    }));
    const all = [...NAV, ...catItems, ...oppItems];
    if (!query) return [...NAV, ...oppItems.slice(0, 6)];
    const needle = query.toLowerCase();
    return all
      .filter((i) => `${i.label} ${i.sub ?? ""}`.toLowerCase().includes(needle))
      .slice(0, 24);
  }, [q, tenders]);

  const go = useCallback(
    (item?: Item) => {
      const target = item ?? results[active];
      if (!target) return;
      setOpen(false);
      router.push(target.href);
    },
    [results, active, router],
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-md border border-line bg-white px-3 py-1.5 text-xs text-ink-muted transition hover:border-ink/30 sm:flex"
        aria-label="بحث"
      >
        <span>بحث…</span>
        <kbd className="nums rounded bg-sand px-1.5 py-0.5 text-[10px] font-semibold text-ink-soft">⌘K</kbd>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 p-4 pt-[12vh] backdrop-blur-sm animate-fade-in"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-line bg-paper shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <span className="text-ink-muted">🔎</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go();
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder="ابحث في الفرص، الجهات، القطاعات…"
            className="w-full bg-transparent py-3.5 text-sm text-ink outline-none placeholder:text-ink-muted"
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-muted">
              {loaded ? "لا نتائج مطابقة." : "جارٍ التحميل…"}
            </p>
          ) : (
            results.map((item, i) => {
              const prevKind = results[i - 1]?.kind;
              return (
                <div key={`${item.href}-${i}`}>
                  {item.kind !== prevKind && (
                    <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                      {KIND_LABEL[item.kind]}
                    </p>
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(item)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-right transition ${
                      i === active ? "bg-sand" : "hover:bg-sand/50"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">{item.label}</span>
                      {item.sub && (
                        <span className="block truncate text-xs text-ink-muted">{item.sub}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-ink-muted">↵</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[11px] text-ink-muted">
          <span>↑↓ للتنقّل · ↵ للفتح · Esc للإغلاق</span>
          <span>{tenders.length} فرصة</span>
        </div>
      </div>
    </div>
  );
}
