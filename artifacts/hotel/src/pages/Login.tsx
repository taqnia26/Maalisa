import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { pickImage } from "@/lib/images";
import { GoldDivider } from "@/components/GoldDivider";

export default function LoginPage({ adminMode = false }: { adminMode?: boolean }) {
  const { t } = useI18n();
  const { login } = useAuth();
  const [, setLoc] = useLocation();
  const [email, setEmail] = useState(adminMode ? "admin@hotel.com" : "");
  const [password, setPassword] = useState(adminMode ? "admin123" : "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      const next = new URLSearchParams(window.location.search).get("next");
      setLoc(next ?? (adminMode ? "/admin" : "/profile"));
    } catch {
      setError(t("auth.invalid"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="pt-20 min-h-screen grid md:grid-cols-2">
      <div className="hidden md:block relative bg-charcoal">
        <img src={pickImage(adminMode ? 4 : 1)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-tr from-charcoal via-charcoal/40 to-transparent" />
        <div className="relative z-10 h-full flex items-end p-14 text-cream">
          <div>
            <div className="text-gold text-xs uppercase tracking-[0.4em] mb-3">{t("brand.name")}</div>
            <div className="font-display text-4xl leading-tight max-w-xs">{t("brand.tagline")}</div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center p-8 md:p-14 bg-cream">
        <form onSubmit={submit} className="w-full max-w-md">
          <div className="text-gold text-xs uppercase tracking-[0.3em] mb-2">{adminMode ? t("admin.signIn") : t("auth.login.title")}</div>
          <h1 className="font-display text-4xl text-charcoal">{adminMode ? t("admin.title") : t("auth.login.title")}</h1>
          <GoldDivider />
          <p className="text-charcoal/70 mt-3 mb-8">{t("auth.login.sub")}</p>
          {adminMode && <div className="text-xs text-bronze bg-cream-deep px-3 py-2 mb-4 border-l-2 border-gold">{t("admin.demoCreds")}</div>}
          <div className="space-y-4">
            <div><label className="label">{t("auth.email")}</label><input type="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><label className="label">{t("auth.password")}</label><input type="password" required className="field" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            {error && <div className="text-destructive text-sm">{error}</div>}
            <button disabled={loading} type="submit" className="btn-gold w-full">{loading ? t("common.loading") : t("auth.signIn")}</button>
          </div>
          {!adminMode && (
            <div className="text-center mt-6 text-sm text-charcoal/70">
              {t("auth.noAccount")} <Link href="/register" className="text-gold hover:underline">{t("auth.createOne")}</Link>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
