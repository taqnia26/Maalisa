import { useListRooms } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { AdminLayout } from "@/components/AdminLayout";
import { formatSAR } from "@/lib/utils";

export default function AdminRooms() {
  const { t, language } = useI18n();
  const { data: rooms } = useListRooms();
  return (
    <AdminLayout>
      <h1 className="font-display text-3xl text-charcoal mb-6">{t("admin.rooms")}</h1>
      <div className="bg-white border border-cream-deep overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cream-deep/50 text-xs uppercase tracking-widest text-charcoal/70">
            <tr><th className="text-start p-3">#</th><th className="text-start p-3">{t("nav.rooms")}</th><th className="text-start p-3">{t("rooms.bedType")}</th><th className="text-start p-3">{t("rooms.guests")}</th><th className="text-start p-3">{t("rooms.from")}</th><th className="text-start p-3">{t("admin.calLegend.available")}</th></tr>
          </thead>
          <tbody>
            {(rooms ?? []).map((r) => (
              <tr key={r.id} className="border-t border-cream-deep">
                <td className="p-3 text-charcoal/60">#{r.id}</td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <img src={r.images[0]} alt="" className="w-14 h-14 object-cover" />
                    <div>
                      <div className="font-medium text-charcoal">{language === "ar" ? r.nameAr : r.name}</div>
                      <div className="text-xs text-charcoal/60 uppercase tracking-widest">{t(`type.${r.type}`)}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3">{r.bedType}</td>
                <td className="p-3">{r.capacity}</td>
                <td className="p-3 text-gold font-bold">{formatSAR(r.price)} {t("common.sar")}</td>
                <td className="p-3"><span className={`badge ${r.status === "available" ? "badge-confirmed" : r.status === "maintenance" ? "badge-pending" : "badge-cancelled"}`}>{t(`status.${r.status}`)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
