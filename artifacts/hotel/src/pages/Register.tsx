import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { pickImage } from "@/lib/images";
import { GoldDivider } from "@/components/GoldDivider";

export default function RegisterPage() {
  const { t } = useI18n();
  const { register } = useAuth();
  const [, setLoc] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError(t("common.passShort")); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(t("common.invalidEmail")); return; }
    setLoading(true);
    try {
      await register(name, email, password, phone || undefined);
      setLoc("/profile");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="pt-20 min-h-screen grid md:grid-cols-2">
      <div className="hidden md:block relative bg-charcoal">
        <img src={pickImage(6)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-tr from-charcoal via-charcoal/40 to-transparent" />
        <div className="relative z-10 h-full flex items-end p-14 text-cream">
          <div>
            <div className="text-gold text-xs uppercase tracking-[0.4em] mb-3">{t("auth.register.title")}</div>
            <div className="font-display text-4xl leading-tight max-w-xs">{t("brand.tagline")}</div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center p-8 md:p-14 bg-cream">
        <form onSubmit={submit} className="w-full max-w-md">
          <div className="text-gold text-xs uppercase tracking-[0.3em] mb-2">{t("auth.register.title")}</div>
          <h1 className="font-display text-4xl text-charcoal">{t("auth.register.title")}</h1>
          <GoldDivider />
          <p className="text-charcoal/70 mt-3 mb-8">{t("auth.register.sub")}</p>
          <div className="space-y-4">
            <div><label className="label">{t("auth.fullName")}</label><input required className="field" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><label className="label">{t("auth.email")}</label><input type="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><label className="label">{t("auth.phone")}</label><input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div><label className="label">{t("auth.password")}</label><input type="password" required className="field" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            {error && <div className="text-destructive text-sm">{error}</div>}
            <button disabled={loading} type="submit" className="btn-gold w-full">{loading ? t("common.loading") : t("auth.signUp")}</button>
          </div>
          <div className="text-center mt-6 text-sm text-charcoal/70">
            {t("auth.haveAccount")} <Link href="/login" className="text-gold hover:underline">{t("auth.signInLink")}</Link>
          </div>
        </form>
      </div>
    </section>
  );
}
