import { useMemo, useState } from "react";
import { useListBookings, useListRooms } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { AdminLayout } from "@/components/AdminLayout";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { formatSAR } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";

function ymdUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export default function AdminCalendar() {
  const { t, language } = useI18n();
  const { data: bookings } = useListBookings();
  const { data: rooms } = useListRooms();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  });
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [openDay, setOpenDay] = useState<string | null>(null);

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-US", { month: "long", year: "numeric", calendar: "gregory", numberingSystem: "latn" }).format(cursor);
  }, [cursor, language]);

  const grid = useMemo(() => {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const firstOfMonth = new Date(Date.UTC(year, month, 1));
    const startWeekday = firstOfMonth.getUTCDay(); // 0=Sun
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

    const cells: Array<{ date: string | null; day: number | null }> = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ date: null, day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(Date.UTC(year, month, d));
      cells.push({ date: ymdUTC(dateObj), day: d });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
    const weeks: Array<typeof cells> = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }, [cursor]);

  const bookingsByDate = useMemo(() => {
    const map: Record<string, Array<{ id: number; reference: string; guestName: string; roomName: string; status: string; totalPrice: number; checkIn: string; checkOut: string }>> = {};
    const list = (bookings ?? []).filter((b) => !selectedRoom || String(b.roomId) === selectedRoom);
    for (const b of list) {
      const start = new Date(b.checkIn);
      const end = new Date(b.checkOut);
      for (let dt = new Date(start); dt < end; dt.setUTCDate(dt.getUTCDate() + 1)) {
        const k = ymdUTC(dt);
        (map[k] ?? (map[k] = [])).push({
          id: b.id, reference: b.reference, guestName: b.guestName, roomName: b.roomName,
          status: b.status, totalPrice: Number(b.totalPrice), checkIn: b.checkIn, checkOut: b.checkOut,
        });
      }
    }
    return map;
  }, [bookings, selectedRoom]);

  const todayKey = ymdUTC(new Date());
  const weekdays = t("admin.cal.weekdayShort").split(",");
  const dayBookings = openDay ? (bookingsByDate[openDay] ?? []) : [];

  function shiftMonth(delta: number) {
    setCursor((c) => new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth() + delta, 1)));
  }
  function goToday() {
    const d = new Date();
    setCursor(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
  }

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-3xl text-charcoal">{t("admin.calendar")}</h1>
        <div className="flex items-center gap-2">
          <select className="field !py-2 !w-auto" value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)}>
            <option value="">{t("admin.cal.allRooms")}</option>
            {(rooms ?? []).map((r) => <option key={r.id} value={r.id}>{language === "ar" ? r.nameAr : r.name}</option>)}
          </select>
          <button onClick={() => shiftMonth(-1)} className="p-2 border border-cream-deep hover:border-gold transition" aria-label="prev"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={goToday} className="px-3 py-2 border border-cream-deep hover:border-gold text-xs uppercase tracking-widest">{t("admin.cal.today")}</button>
          <button onClick={() => shiftMonth(1)} className="p-2 border border-cream-deep hover:border-gold transition" aria-label="next"><ChevronRight className="w-4 h-4" /></button>
          <div className="font-display text-lg text-charcoal min-w-[160px] text-center" dir="ltr">{monthLabel}</div>
        </div>
      </div>

      <div className="bg-white border border-cream-deep overflow-hidden">
        {/* Weekday header */}
        <div className="grid grid-cols-7 bg-charcoal text-cream text-[11px] uppercase tracking-widest">
          {weekdays.map((w, i) => (
            <div key={i} className="p-3 text-center border-l border-cream/10 first:border-l-0">{w.trim()}</div>
          ))}
        </div>
        {/* Days */}
        {grid.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-t border-cream-deep">
            {week.map((cell, ci) => {
              if (!cell.date) return <div key={ci} className="bg-cream/40 min-h-[110px] border-l border-cream-deep first:border-l-0" />;
              const evs = bookingsByDate[cell.date] ?? [];
              const isToday = cell.date === todayKey;
              const occupancy = (rooms?.length ?? 1) > 0 ? Math.min(1, evs.length / (rooms?.length ?? 1)) : 0;
              return (
                <button
                  key={ci}
                  onClick={() => setOpenDay(cell.date)}
                  className={`relative text-start min-h-[110px] p-2 border-l border-cream-deep first:border-l-0 hover:bg-gold/5 transition group ${isToday ? "bg-gold/10" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-sm font-bold ${isToday ? "text-gold" : "text-charcoal"}`} dir="ltr">{cell.day}</span>
                    {evs.length > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-gold/20 text-gold rounded-sm" dir="ltr">{evs.length}</span>}
                  </div>
                  <div className="space-y-1">
                    {evs.slice(0, 3).map((e) => (
                      <div key={e.id} className={`text-[10px] px-1.5 py-0.5 truncate rounded-sm ${
                        e.status === "confirmed" ? "bg-gold/25 text-charcoal" :
                        e.status === "pending" ? "bg-amber-200/70 text-amber-900" :
                        e.status === "checked_in" ? "bg-emerald-200/70 text-emerald-900" :
                        e.status === "cancelled" ? "bg-red-200/60 text-red-900 line-through opacity-60" :
                        "bg-charcoal/15 text-charcoal"
                      }`}>
                        {e.guestName.split(" ")[0]} · {e.roomName.split(" ")[0]}
                      </div>
                    ))}
                    {evs.length > 3 && <div className="text-[10px] text-charcoal/60">+{evs.length - 3}</div>}
                  </div>
                  {/* Occupancy bar */}
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-cream-deep">
                    <div className="h-full bg-gold transition-all" style={{ width: `${occupancy * 100}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-charcoal/70">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-gold/25 rounded-sm" />{t("admin.statusConfirmed")}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-200 rounded-sm" />{t("admin.statusPending")}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-200 rounded-sm" />{t("admin.statusCheckedIn")}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-200 rounded-sm" />{t("admin.statusCancelled")}</span>
      </div>

      {/* Day modal */}
      {openDay && (
        <div className="fixed inset-0 z-[80] bg-charcoal/70 flex items-center justify-center p-5" onClick={() => setOpenDay(null)}>
          <div className="bg-white border border-cream-deep p-7 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-2xl text-charcoal" dir="ltr">{openDay}</h3>
              <button onClick={() => setOpenDay(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="text-xs text-charcoal/60 mb-3 uppercase tracking-widest">{dayBookings.length} {t("admin.cal.bookings")}</div>
            {dayBookings.length === 0 ? (
              <div className="text-charcoal/60 text-sm italic py-4">{t("admin.cal.empty")}</div>
            ) : (
              <div className="space-y-3">
                {dayBookings.map((e) => (
                  <div key={e.id} className="border border-cream-deep p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium text-charcoal">{e.guestName}</div>
                      <StatusBadge status={e.status} />
                    </div>
                    <div className="text-xs text-charcoal/60">{e.roomName} · <span className="font-mono text-gold">{e.reference}</span></div>
                    <div className="flex justify-between mt-1 text-xs">
                      <span className="text-charcoal/60" dir="ltr">{e.checkIn} → {e.checkOut}</span>
                      <span className="text-gold font-bold" dir="ltr">{formatSAR(e.totalPrice)} SAR</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
