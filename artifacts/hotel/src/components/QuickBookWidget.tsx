import { useState } from "react";
import { useLocation } from "wouter";
import { useListRooms } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { todayISO } from "@/lib/utils";
import { Calendar as CalendarIcon, Users, BedDouble, Search } from "lucide-react";

export function QuickBookWidget() {
  const { t, language } = useI18n();
  const [, setLocation] = useLocation();
  const { data: rooms } = useListRooms();
  const [checkIn, setCheckIn] = useState(todayISO(1));
  const [checkOut, setCheckOut] = useState(todayISO(3));
  const [guests, setGuests] = useState(2);
  const [roomId, setRoomId] = useState<string>("");

  function handleSearch() {
    const params = new URLSearchParams({ checkIn, checkOut, guests: String(guests) });
    if (roomId) params.set("roomId", roomId);
    setLocation(`/booking?${params.toString()}`);
  }

  return (
    <div className="quick-book-card">
      <div className="text-center mb-5">
        <div className="text-gold text-xs uppercase tracking-[0.3em] mb-1.5">{t("quickBook.title")}</div>
        <div className="text-charcoal/60 text-sm">{t("quickBook.sub")}</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <Field icon={<CalendarIcon className="w-3.5 h-3.5" />} label={t("booking.checkIn")}>
          <input type="date" lang="en-US" dir="ltr" min={todayISO(0)} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="quick-input" />
        </Field>
        <Field icon={<CalendarIcon className="w-3.5 h-3.5" />} label={t("booking.checkOut")}>
          <input type="date" lang="en-US" dir="ltr" min={checkIn || todayISO(1)} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="quick-input" />
        </Field>
        <Field icon={<Users className="w-3.5 h-3.5" />} label={t("booking.guests")}>
          <input type="number" lang="en-US" dir="ltr" min={1} max={10} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="quick-input" />
        </Field>
        <Field icon={<BedDouble className="w-3.5 h-3.5" />} label={t("booking.room")}>
          <select className="quick-input" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            <option value="">—</option>
            {(rooms ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {language === "ar" ? r.nameAr : r.name}
              </option>
            ))}
          </select>
        </Field>
        <button onClick={handleSearch} className="btn-gold !py-3 !px-5 w-full">
          <Search className="w-4 h-4" />
          {t("quickBook.checkAvailability")}
        </button>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-charcoal/60 mb-1.5">
        <span className="text-gold">{icon}</span>{label}
      </span>
      {children}
    </label>
  );
}
