import { useState, useMemo } from "react";
import { useAdminCalendar } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { AdminLayout } from "@/components/AdminLayout";

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function AdminCalendar() {
  const { t } = useI18n();
  const [month, setMonth] = useState(currentMonth());
  const { data } = useAdminCalendar({ month });

  const grid = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    const rooms: Record<string, string> = {};
    const dates = new Set<string>();
    for (const e of data ?? []) {
      rooms[String(e.roomId)] = e.roomName;
      dates.add(e.date);
      map[String(e.roomId)] = map[String(e.roomId)] ?? {};
      map[String(e.roomId)][e.date] = e.status;
    }
    return {
      roomIds: Object.keys(rooms),
      rooms,
      dates: Array.from(dates).sort(),
      map,
    };
  }, [data]);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl text-charcoal">{t("admin.calendar")}</h1>
        <input type="month" className="field !py-2 !w-auto" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>
      <div className="flex items-center gap-4 mb-4 text-xs">
        <span className="flex items-center gap-2"><span className="w-3 h-3 cal-available inline-block" />{t("admin.calLegend.available")}</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 cal-booked inline-block" />{t("admin.calLegend.booked")}</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 cal-maintenance inline-block" />{t("admin.calLegend.maintenance")}</span>
      </div>
      <div className="bg-white border border-cream-deep overflow-auto">
        <table className="text-xs">
          <thead>
            <tr>
              <th className="sticky ltr:left-0 rtl:right-0 bg-cream-deep p-2 text-start uppercase tracking-widest min-w-[140px]">{t("nav.rooms")}</th>
              {grid.dates.map((d) => <th key={d} className="p-1 text-charcoal/60 font-normal">{d.slice(8)}</th>)}
            </tr>
          </thead>
          <tbody>
            {grid.roomIds.map((rid) => (
              <tr key={rid}>
                <td className="sticky ltr:left-0 rtl:right-0 bg-white p-2 text-start font-medium border-t border-cream-deep">{grid.rooms[rid]}</td>
                {grid.dates.map((d) => {
                  const s = grid.map[rid]?.[d] ?? "available";
                  const cls = s === "booked" ? "cal-booked" : s === "maintenance" ? "cal-maintenance" : "cal-available";
                  return <td key={d} className={`${cls} border-t border-cream-deep w-7 h-7 text-center`}>{}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
