import { useI18n } from "@/lib/i18n";

export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const map: Record<string, { cls: string; key: string }> = {
    pending: { cls: "badge-pending", key: "admin.statusPending" },
    confirmed: { cls: "badge-confirmed", key: "admin.statusConfirmed" },
    checked_in: { cls: "badge-checked-in", key: "admin.statusCheckedIn" },
    checked_out: { cls: "badge-checked-out", key: "admin.statusCheckedOut" },
    cancelled: { cls: "badge-cancelled", key: "admin.statusCancelled" },
  };
  const m = map[status] ?? { cls: "", key: status };
  return <span className={`badge ${m.cls}`}>{t(m.key)}</span>;
}
