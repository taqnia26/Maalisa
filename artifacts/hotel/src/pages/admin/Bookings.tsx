import { useMemo, useState } from "react";
import { useListBookings, useUpdateBookingStatus, getListBookingsQueryKey, UpdateBookingStatusBodyStatus } from "@workspace/api-client-react";
type StatusT = UpdateBookingStatusBodyStatus;
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { AdminLayout } from "@/components/AdminLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { formatSAR } from "@/lib/utils";
import { Download, X } from "lucide-react";

const STATUSES: StatusT[] = [
  UpdateBookingStatusBodyStatus.pending,
  UpdateBookingStatusBodyStatus.confirmed,
  UpdateBookingStatusBodyStatus.checked_in,
  UpdateBookingStatusBodyStatus.checked_out,
  UpdateBookingStatusBodyStatus.cancelled,
];

export const STATUS_I18N_KEYS: Record<string, string> = {
  pending: "admin.statusPending",
  confirmed: "admin.statusConfirmed",
  checked_in: "admin.statusCheckedIn",
  checked_out: "admin.statusCheckedOut",
  cancelled: "admin.statusCancelled",
};

export default function AdminBookings() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: bookings } = useListBookings();
  const update = useUpdateBookingStatus();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return (bookings ?? []).filter((b) => {
      if (status && b.status !== status) return false;
      if (from && b.checkIn < from) return false;
      if (to && b.checkOut > to) return false;
      return true;
    });
  }, [bookings, status, from, to]);

  function exportCsv() {
    const rows = [
      ["Reference", "Guest", "Email", "Phone", "Room", "Check-in", "Check-out", "Nights", "Guests", "Total SAR", "Status"],
      ...filtered.map((b) => [b.reference, b.guestName, b.guestEmail, b.guestPhone, b.roomName, b.checkIn, b.checkOut, b.nights, b.guests, b.totalPrice, b.status]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = t("admin.exportFile"); a.click();
    URL.revokeObjectURL(url);
  }

  async function setStatusFor(id: number, s: StatusT) {
    await update.mutateAsync({ id, data: { status: s } });
    qc.invalidateQueries({ queryKey: getListBookingsQueryKey() });
  }

  const detail = open != null ? (bookings ?? []).find((b) => b.id === open) : null;

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <h1 className="font-display text-3xl text-charcoal flex-1">{t("admin.bookings")}</h1>
        <div><label className="label">{t("booking.checkIn")}</label><input type="date" lang="en-US" dir="ltr" className="field !py-2" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><label className="label">{t("booking.checkOut")}</label><input type="date" lang="en-US" dir="ltr" className="field !py-2" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div>
          <label className="label">{t("admin.updateStatus")}</label>
          <select className="field !py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">—</option>
            {STATUSES.map((s) => <option key={s} value={s}>{t(STATUS_I18N_KEYS[s] ?? s)}</option>)}
          </select>
        </div>
        <button onClick={exportCsv} className="btn-outline-gold !py-2 !px-4 !text-xs"><Download className="w-3.5 h-3.5" />{t("admin.export")}</button>
      </div>
      <div className="bg-white border border-cream-deep overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-cream-deep/50 text-xs uppercase tracking-widest text-charcoal/70">
            <tr>
              <th className="text-start p-3">Ref</th>
              <th className="text-start p-3">{t("booking.fullName")}</th>
              <th className="text-start p-3">{t("nav.rooms")}</th>
              <th className="text-start p-3">{t("booking.checkIn")}</th>
              <th className="text-start p-3">{t("booking.checkOut")}</th>
              <th className="text-start p-3">{t("booking.total")}</th>
              <th className="text-start p-3">{t("admin.updateStatus")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id} className="border-t border-cream-deep">
                <td className="p-3 font-mono text-xs text-gold">{b.reference}</td>
                <td className="p-3">{b.guestName}<div className="text-xs text-charcoal/60">{b.guestEmail}</div></td>
                <td className="p-3">{b.roomName}</td>
                <td className="p-3">{b.checkIn}</td>
                <td className="p-3">{b.checkOut}</td>
                <td className="p-3 text-gold font-bold">{formatSAR(b.totalPrice)}</td>
                <td className="p-3">
                  <select value={b.status} onChange={(e) => setStatusFor(b.id, e.target.value as StatusT)} className="field !py-1 !px-2 !text-xs">
                    {STATUSES.map((s) => <option key={s} value={s}>{t(STATUS_I18N_KEYS[s] ?? s)}</option>)}
                  </select>
                </td>
                <td className="p-3"><button onClick={() => setOpen(b.id)} className="text-gold text-xs hover:underline">{t("admin.viewDetails")}</button></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-charcoal/50 italic">—</td></tr>}
          </tbody>
        </table>
      </div>
      {detail && (
        <div className="fixed inset-0 z-[80] bg-charcoal/70 flex items-center justify-center p-5" onClick={() => setOpen(null)}>
          <div className="bg-white border border-cream-deep p-8 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-2xl text-charcoal">{detail.reference}</h3>
              <button onClick={() => setOpen(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Cell k={t("booking.fullName")} v={detail.guestName} />
              <Cell k={t("booking.email")} v={detail.guestEmail} />
              <Cell k={t("booking.phone")} v={detail.guestPhone} />
              <Cell k={t("nav.rooms")} v={detail.roomName} />
              <Cell k={t("booking.checkIn")} v={detail.checkIn} />
              <Cell k={t("booking.checkOut")} v={detail.checkOut} />
              <Cell k={t("booking.guests")} v={String(detail.guests)} />
              <Cell k={t("booking.total")} v={`${formatSAR(detail.totalPrice)} ${t("common.sar")}`} />
            </div>
            <div className="mt-4"><StatusBadge status={detail.status} /></div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function Cell({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-charcoal/50">{k}</div>
      <div className="text-charcoal font-medium">{v}</div>
    </div>
  );
}
