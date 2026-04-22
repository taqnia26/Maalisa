import { useMemo, useState } from "react";
import {
  useListBookings,
  useUpdateBookingStatus,
  getListBookingsQueryKey,
  UpdateBookingStatusBodyStatus,
  useListRooms,
} from "@workspace/api-client-react";
type StatusT = UpdateBookingStatusBodyStatus;
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { AdminLayout } from "@/components/AdminLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { formatSAR } from "@/lib/utils";
import { Download, X, Plus, Search, Wallet } from "lucide-react";

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

interface Branch {
  id: number;
  name: string;
}
interface Payment {
  id: number;
  amount: number;
  method: string;
  branchName: string | null;
  receivedByName: string | null;
  note: string | null;
  createdAt: string;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${r.status})`);
  }
  return r.json() as Promise<T>;
}

export default function AdminBookings() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: bookings } = useListBookings();
  const update = useUpdateBookingStatus();
  const branchesQ = useQuery({
    queryKey: ["branches"],
    queryFn: () => api<Branch[]>("/api/admin/branches"),
  });
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [refSearch, setRefSearch] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showPay, setShowPay] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const ref = refSearch.trim().toUpperCase();
    return (bookings ?? []).filter((b) => {
      if (status && b.status !== status) return false;
      if (from && b.checkIn < from) return false;
      if (to && b.checkOut > to) return false;
      if (ref && !b.reference.toUpperCase().includes(ref) && !b.guestName.toUpperCase().includes(ref)) return false;
      return true;
    });
  }, [bookings, status, from, to, refSearch]);

  function exportCsv() {
    const rows = [
      ["Reference", "Guest", "Email", "Phone", "Room", "Check-in", "Check-out", "Nights", "Guests", "Total SAR", "Paid SAR", "Payment", "Status"],
      ...filtered.map((b) => [
        b.reference,
        b.guestName,
        b.guestEmail,
        b.guestPhone,
        b.roomName,
        b.checkIn,
        b.checkOut,
        b.nights,
        b.guests,
        b.totalPrice,
        // these may not be in generated types yet — coerce safely
        (b as unknown as { paidAmount?: number }).paidAmount ?? 0,
        (b as unknown as { paymentStatus?: string }).paymentStatus ?? "unpaid",
        b.status,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = t("admin.exportFile");
    a.click();
    URL.revokeObjectURL(url);
  }

  async function setStatusFor(id: number, s: StatusT) {
    await update.mutateAsync({ id, data: { status: s } });
    qc.invalidateQueries({ queryKey: getListBookingsQueryKey() });
  }

  const detail = open != null ? (bookings ?? []).find((b) => b.id === open) : null;

  function paymentStatusOf(b: { paymentStatus?: string; totalPrice: number }) {
    return (b as unknown as { paymentStatus?: string }).paymentStatus ?? "unpaid";
  }
  function paidOf(b: { totalPrice: number }) {
    return (b as unknown as { paidAmount?: number }).paidAmount ?? 0;
  }

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <h1 className="font-display text-3xl text-charcoal flex-1">{t("admin.bookings")}</h1>
        <div className="relative">
          <label className="label">{t("admin.searchRef")}</label>
          <Search className="w-3.5 h-3.5 absolute top-9 ltr:left-2 rtl:right-2 text-charcoal/40 pointer-events-none" />
          <input
            type="text"
            className="field !py-2 ltr:!pl-7 rtl:!pr-7"
            placeholder="NM-XXXXXX"
            value={refSearch}
            onChange={(e) => setRefSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="label">{t("booking.checkIn")}</label>
          <input type="date" lang="en-US" dir="ltr" className="field !py-2" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">{t("booking.checkOut")}</label>
          <input type="date" lang="en-US" dir="ltr" className="field !py-2" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="label">{t("admin.updateStatus")}</label>
          <select className="field !py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">—</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(STATUS_I18N_KEYS[s] ?? s)}
              </option>
            ))}
          </select>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-gold !py-2 !px-4 !text-xs">
          <Plus className="w-3.5 h-3.5" /> {t("admin.newBooking")}
        </button>
        <button onClick={exportCsv} className="btn-outline-gold !py-2 !px-4 !text-xs">
          <Download className="w-3.5 h-3.5" />
          {t("admin.export")}
        </button>
      </div>
      <div className="bg-white border border-cream-deep overflow-x-auto">
        <table className="w-full text-sm min-w-[1000px]">
          <thead className="bg-cream-deep/50 text-xs uppercase tracking-widest text-charcoal/70">
            <tr>
              <th className="text-start p-3">Ref</th>
              <th className="text-start p-3">{t("booking.fullName")}</th>
              <th className="text-start p-3">{t("nav.rooms")}</th>
              <th className="text-start p-3">{t("booking.checkIn")}</th>
              <th className="text-start p-3">{t("booking.checkOut")}</th>
              <th className="text-start p-3">{t("booking.total")}</th>
              <th className="text-start p-3">{t("admin.payment")}</th>
              <th className="text-start p-3">{t("admin.updateStatus")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const pStatus = paymentStatusOf(b);
              const paid = paidOf(b);
              return (
                <tr key={b.id} className="border-t border-cream-deep">
                  <td className="p-3 font-mono text-xs text-gold">{b.reference}</td>
                  <td className="p-3">
                    {b.guestName}
                    <div className="text-xs text-charcoal/60">{b.guestEmail}</div>
                  </td>
                  <td className="p-3">{b.roomName}</td>
                  <td className="p-3">{b.checkIn}</td>
                  <td className="p-3">{b.checkOut}</td>
                  <td className="p-3 text-gold font-bold">{formatSAR(b.totalPrice)}</td>
                  <td className="p-3">
                    <PaymentChip status={pStatus} />
                    <div className="text-[10px] text-charcoal/60 mt-1">
                      {formatSAR(paid)} / {formatSAR(b.totalPrice)}
                    </div>
                  </td>
                  <td className="p-3">
                    <select value={b.status} onChange={(e) => setStatusFor(b.id, e.target.value as StatusT)} className="field !py-1 !px-2 !text-xs">
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {t(STATUS_I18N_KEYS[s] ?? s)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <button onClick={() => setShowPay(b.id)} className="text-bronze text-xs hover:underline mx-1 inline-flex items-center gap-1">
                      <Wallet className="w-3 h-3" />
                      {t("admin.recordPayment")}
                    </button>
                    <button onClick={() => setOpen(b.id)} className="text-gold text-xs hover:underline mx-1">
                      {t("admin.viewDetails")}
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-charcoal/50 italic">
                  —
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <BookingDetailDialog
          booking={detail}
          paid={paidOf(detail)}
          paymentStatus={paymentStatusOf(detail)}
          onClose={() => setOpen(null)}
        />
      )}
      {showCreate && (
        <CreateBookingDialog
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            qc.invalidateQueries({ queryKey: getListBookingsQueryKey() });
          }}
        />
      )}
      {showPay !== null && (
        <RecordPaymentDialog
          bookingId={showPay}
          branches={branchesQ.data ?? []}
          onClose={() => setShowPay(null)}
          onSaved={() => {
            setShowPay(null);
            qc.invalidateQueries({ queryKey: getListBookingsQueryKey() });
          }}
        />
      )}
    </AdminLayout>
  );
}

function PaymentChip({ status }: { status: string }) {
  const { t } = useI18n();
  const map: Record<string, { label: string; cls: string }> = {
    paid: { label: t("admin.paid"), cls: "bg-emerald-100 text-emerald-800" },
    partial: { label: t("admin.partial"), cls: "bg-amber-100 text-amber-800" },
    unpaid: { label: t("admin.unpaid"), cls: "bg-rose-100 text-rose-800" },
  };
  const { label, cls } = map[status] ?? map.unpaid;
  return <span className={`text-[10px] px-2 py-1 uppercase tracking-widest ${cls}`}>{label}</span>;
}

function BookingDetailDialog({
  booking,
  paid,
  paymentStatus,
  onClose,
}: {
  booking: { id: number; reference: string; guestName: string; guestEmail: string; guestPhone: string; roomName: string; checkIn: string; checkOut: string; guests: number; totalPrice: number; status: string };
  paid: number;
  paymentStatus: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const detailQ = useQuery({
    queryKey: ["booking-full", booking.id],
    queryFn: () => api<{ booking: unknown; payments: Payment[] }>(`/api/admin/bookings/${booking.id}/full`),
  });
  return (
    <div className="fixed inset-0 z-[80] bg-charcoal/70 flex items-center justify-center p-5" onClick={onClose}>
      <div className="bg-white border border-cream-deep p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-2xl text-charcoal">{booking.reference}</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <Cell k={t("booking.fullName")} v={booking.guestName} />
          <Cell k={t("booking.email")} v={booking.guestEmail} />
          <Cell k={t("booking.phone")} v={booking.guestPhone} />
          <Cell k={t("nav.rooms")} v={booking.roomName} />
          <Cell k={t("booking.checkIn")} v={booking.checkIn} />
          <Cell k={t("booking.checkOut")} v={booking.checkOut} />
          <Cell k={t("booking.guests")} v={String(booking.guests)} />
          <Cell k={t("booking.total")} v={`${formatSAR(booking.totalPrice)} ${t("common.sar")}`} />
          <Cell k={t("admin.paid")} v={`${formatSAR(paid)} ${t("common.sar")}`} />
          <Cell k={t("admin.balance")} v={`${formatSAR(Math.max(0, booking.totalPrice - paid))} ${t("common.sar")}`} />
        </div>
        <div className="flex items-center gap-2 mb-4">
          <StatusBadge status={booking.status} />
          <PaymentChip status={paymentStatus} />
        </div>
        <h4 className="font-display text-lg text-charcoal mb-2">{t("admin.payments")}</h4>
        <div className="border border-cream-deep">
          <table className="w-full text-xs">
            <thead className="bg-cream-deep/50 uppercase tracking-widest text-charcoal/70">
              <tr>
                <th className="text-start p-2">{t("admin.finance.date")}</th>
                <th className="text-start p-2">{t("admin.finance.amount")}</th>
                <th className="text-start p-2">{t("admin.finance.method")}</th>
                <th className="text-start p-2">{t("admin.branchName")}</th>
                <th className="text-start p-2">{t("admin.receivedBy")}</th>
              </tr>
            </thead>
            <tbody>
              {(detailQ.data?.payments ?? []).map((p) => (
                <tr key={p.id} className="border-t border-cream-deep">
                  <td className="p-2">{new Date(p.createdAt).toLocaleString()}</td>
                  <td className="p-2 text-bronze font-bold">{formatSAR(p.amount)}</td>
                  <td className="p-2">{p.method}</td>
                  <td className="p-2">{p.branchName ?? "—"}</td>
                  <td className="p-2">{p.receivedByName ?? "—"}</td>
                </tr>
              ))}
              {(detailQ.data?.payments ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-charcoal/50 italic">
                    —
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
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

function CreateBookingDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t } = useI18n();
  const { data: rooms } = useListRooms();
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [form, setForm] = useState({
    roomId: "",
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    guests: 2,
    checkIn: today,
    checkOut: tomorrow,
    notes: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: (data: typeof form) =>
      api("/api/admin/bookings", {
        method: "POST",
        body: JSON.stringify({ ...data, roomId: Number(data.roomId) }),
      }),
    onSuccess: onCreated,
    onError: (e: Error) => setErr(e.message),
  });
  return (
    <div className="fixed inset-0 z-[80] bg-charcoal/70 flex items-center justify-center p-5" onClick={onClose}>
      <div className="bg-white p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-2xl text-charcoal">{t("admin.newBooking")}</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setErr(null);
            create.mutate(form);
          }}
        >
          <div>
            <label className="label">{t("nav.rooms")}</label>
            <select className="field" value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })} required>
              <option value="">—</option>
              {(rooms ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t("booking.checkIn")}</label>
              <input type="date" lang="en-US" dir="ltr" className="field" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} required />
            </div>
            <div>
              <label className="label">{t("booking.checkOut")}</label>
              <input type="date" lang="en-US" dir="ltr" className="field" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label">{t("booking.fullName")}</label>
            <input className="field" value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t("booking.phone")}</label>
              <input className="field" value={form.guestPhone} onChange={(e) => setForm({ ...form, guestPhone: e.target.value })} required />
            </div>
            <div>
              <label className="label">{t("booking.guests")}</label>
              <input type="number" min={1} className="field" value={form.guests} onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })} required />
            </div>
          </div>
          <div>
            <label className="label">{t("booking.email")}</label>
            <input type="email" className="field" value={form.guestEmail} onChange={(e) => setForm({ ...form, guestEmail: e.target.value })} />
          </div>
          <div>
            <label className="label">{t("booking.notes")}</label>
            <textarea className="field" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {err && <div className="text-xs text-destructive">{err}</div>}
          <button type="submit" disabled={create.isPending} className="btn-gold w-full !py-2">
            {create.isPending ? t("common.loading") : t("common.save")}
          </button>
        </form>
      </div>
    </div>
  );
}

function RecordPaymentDialog({
  bookingId,
  branches,
  onClose,
  onSaved,
}: {
  bookingId: number;
  branches: Branch[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState({ amount: "", method: "cash", branchId: "", note: "" });
  const [err, setErr] = useState<string | null>(null);
  const pay = useMutation({
    mutationFn: () =>
      api(`/api/admin/bookings/${bookingId}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: Number(form.amount),
          method: form.method,
          branchId: form.branchId ? Number(form.branchId) : undefined,
          note: form.note || undefined,
        }),
      }),
    onSuccess: onSaved,
    onError: (e: Error) => setErr(e.message),
  });
  return (
    <div className="fixed inset-0 z-[80] bg-charcoal/70 flex items-center justify-center p-5" onClick={onClose}>
      <div className="bg-white p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-2xl text-charcoal">{t("admin.recordPayment")}</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setErr(null);
            pay.mutate();
          }}
        >
          <div>
            <label className="label">{t("admin.finance.amount")} ({t("common.sar")})</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              lang="en-US"
              dir="ltr"
              className="field"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">{t("admin.finance.method")}</label>
            <select className="field" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              <option value="cash">{t("admin.payMethodCash")}</option>
              <option value="card">{t("admin.payMethodCard")}</option>
              <option value="transfer">{t("admin.payMethodTransfer")}</option>
              <option value="other">{t("admin.payMethodOther")}</option>
            </select>
          </div>
          <div>
            <label className="label">{t("admin.branchName")}</label>
            <select className="field" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
              <option value="">—</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("booking.notes")}</label>
            <textarea className="field" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          {err && <div className="text-xs text-destructive">{err}</div>}
          <button type="submit" disabled={pay.isPending} className="btn-gold w-full !py-2">
            {pay.isPending ? t("common.loading") : t("admin.recordPayment")}
          </button>
        </form>
      </div>
    </div>
  );
}
