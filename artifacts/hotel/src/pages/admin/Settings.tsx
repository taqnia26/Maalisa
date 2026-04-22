import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { AdminLayout } from "@/components/AdminLayout";

export default function AdminSettings() {
  const { t } = useI18n();
  const [name, setName] = useState("Nuzul Al-Ma'ali");
  const [email, setEmail] = useState("info@nuzulalmaali.com");
  const [phone, setPhone] = useState("+966 50 000 0000");
  const [pw, setPw] = useState("");
  const [saved, setSaved] = useState(false);
  function save(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
  }
  return (
    <AdminLayout>
      <h1 className="font-display text-3xl text-charcoal mb-6">{t("admin.settings")}</h1>
      <form onSubmit={save} className="max-w-2xl bg-white border border-cream-deep p-8 space-y-5">
        <div><label className="label">{t("admin.hotelName")}</label><input className="field" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">{t("admin.contactEmail")}</label><input className="field" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><label className="label">{t("admin.contactPhone")}</label><input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        </div>
        <div><label className="label">{t("admin.changePassword")}</label><input type="password" className="field" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••" /></div>
        <div className="flex items-center gap-3">
          <button className="btn-gold">{t("admin.save")}</button>
          {saved && <span className="text-bronze text-sm">✓ {t("admin.saved")}</span>}
        </div>
      </form>
    </AdminLayout>
  );
}
