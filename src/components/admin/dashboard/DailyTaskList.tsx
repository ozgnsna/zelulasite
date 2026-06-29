import Link from "next/link";

export type DailyTaskItem = {
  id: string;
  priority: "urgent" | "now" | "normal";
  title: string;
  description: string;
  href: string;
  actionLabel: string;
};

const priorityLabel: Record<DailyTaskItem["priority"], string> = {
  urgent: "Acil",
  now: "Şimdi",
  normal: "Bugün",
};

const priorityClass: Record<DailyTaskItem["priority"], string> = {
  urgent: "bg-rose-100 text-rose-900 ring-rose-200/80",
  now: "bg-amber-100 text-amber-950 ring-amber-200/80",
  normal: "bg-stone-200/90 text-stone-700 ring-stone-300/60",
};

export function DailyTaskList({ tasks }: { tasks: DailyTaskItem[] }) {
  if (tasks.length === 0) {
    return (
      <section className="rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-emerald-950">Bugünün görevleri</h2>
        <p className="mt-1 text-[13px] text-emerald-900/90">Kritik iş kalmadı — vitrin ve stokları rutin kontrol yeterli.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-stone-200/75 bg-[#f9f7f3]/80 p-5 shadow-[0_3px_16px_-8px_rgba(28,25,23,0.06)]">
      <h2 className="text-base font-semibold text-stone-950">Bugünün görevleri</h2>
      <p className="mt-1 text-sm text-stone-700">Öncelik sırasıyla — her satır doğrudan aksiyona gider.</p>
      <ul className="mt-4 space-y-3">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="flex flex-col gap-2 rounded-xl border border-stone-200/80 bg-white px-3.5 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${priorityClass[task.priority]}`}
                >
                  {priorityLabel[task.priority]}
                </span>
                <p className="text-[14px] font-bold leading-snug text-stone-950">{task.title}</p>
              </div>
              <p className="mt-1 text-[13px] leading-snug text-stone-700">{task.description}</p>
            </div>
            <Link
              href={task.href}
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-stone-900 px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-stone-800"
            >
              {task.actionLabel}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
