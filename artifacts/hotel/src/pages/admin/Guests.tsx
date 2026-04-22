import { useAdminGuests } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { AdminLayout } from "@/components/AdminLayout";
import { formatSAR } from "@/lib/utils";

export default function AdminGuests() {
  const { t } = useI18n();
  const { data: guests } = useAdminGuests();
  return (
    <AdminLayout>
      <h1 className="font-display text-3xl text-charcoal mb-6">{t("admin.guests")}</h1>
      <div className="bg-white border border-cream-deep overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-cream-deep/50 text-xs uppercase tracking-widest text-charcoal/70">
            <tr><th className="text-start p-3">{t("auth.fullName")}</th><th className="text-start p-3">{t("auth.email")}</th><th className="text-start p-3">{t("auth.phone")}</th><th className="text-start p-3">{t("admin.bookingsCount")}</th><th className="text-start p-3">{t("admin.totalSpent")}</th><th /></tr>
          </thead>
          <tbody>
            {(guests ?? []).map((g) => (
              <tr key={g.id} className="border-t border-cream-deep">
                <td className="p-3 font-medium">{g.name}</td>
                <td className="p-3 text-charcoal/70">{g.email}</td>
                <td className="p-3 text-charcoal/70">{g.phone ?? "—"}</td>
                <td className="p-3">{g.bookingsCount}</td>
                <td className="p-3 text-gold font-bold">{formatSAR(g.totalSpent)} {t("common.sar")}</td>
                <td className="p-3 text-end">
                  <button className="text-xs text-charcoal/60 hover:text-destructive uppercase tracking-widest">{g.blocked ? t("admin.unblock") : t("admin.block")}</button>
                </td>
              </tr>
            ))}
            {(!guests || guests.length === 0) && <tr><td colSpan={6} className="p-8 text-center text-charcoal/50 italic">—</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
