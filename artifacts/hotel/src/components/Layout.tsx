import { Link, useLocation } from "wouter";
import { useEffect, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Menu, X, Globe, Phone, Mail, MapPin, User as UserIcon, LogOut } from "lucide-react";
import { GoldDivider } from "./GoldDivider";

function NavLink({ href, label }: { href: string; label: string }) {
  const [loc] = useLocation();
  const active = loc === href || (href !== "/" && loc.startsWith(href));
  return (
    <Link href={href} className={`nav-link text-sm uppercase tracking-widest font-semibold ${active ? "active text-gold" : "text-cream"}`}>
        {label}
      </Link>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { t, toggle } = useI18n();
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navItems = [
    { href: "/", label: t("nav.home") },
    { href: "/rooms", label: t("nav.rooms") },
    { href: "/suites", label: t("nav.suites") },
    { href: "/booking", label: t("nav.bookNow") },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-cream text-charcoal">
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? "glass-dark header-scrolled" : "bg-transparent"
        }`}
        style={{ background: scrolled ? undefined : "linear-gradient(180deg, rgba(26,26,46,0.55), transparent)" }}
      >
        <div className="max-w-[1400px] mx-auto px-5 md:px-10 h-20 flex items-center justify-between gap-6">
          <Link href="/" className="flex flex-col leading-tight">
              <span className="font-display text-2xl text-gold">{t("brand.name")}</span>
              <span className="text-[10px] uppercase tracking-[0.3em] text-cream/70">Riyadh · Saudi Arabia</span>
            </Link>
          <nav className="hidden lg:flex items-center gap-8">
            {navItems.map((n) => <NavLink key={n.href} href={n.href} label={n.label} />)}
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={toggle} className="btn-ghost-cream !py-2 !px-3" aria-label="Toggle language">
              <Globe className="w-4 h-4" />
              <span className="text-xs font-bold">{t("lang.toggle")}</span>
            </button>
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <Link href={user.role === "admin" ? "/admin" : "/profile"} className="btn-ghost-cream !py-2 !px-3">
                    <UserIcon className="w-4 h-4" />
                    <span className="text-xs font-bold">{user.name.split(" ")[0]}</span>
                  </Link>
                <button onClick={() => logout()} className="btn-ghost-cream !py-2 !px-3">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link href="/login" className="hidden md:inline-flex btn-ghost-cream !py-2 !px-4">
                  <span className="text-xs font-bold">{t("nav.signIn")}</span>
                </Link>
            )}
            <Link href="/booking" className="hidden md:inline-flex btn-gold !py-2.5 !px-5 !text-xs">
                <span>{t("nav.bookNow")}</span>
              </Link>
            <button className="lg:hidden text-cream p-2" onClick={() => setOpen(true)} aria-label="Menu">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-charcoal/80" onClick={() => setOpen(false)} />
          <aside className="absolute top-0 ltr:right-0 rtl:left-0 h-full w-[80%] max-w-sm bg-charcoal text-cream p-8 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <span className="font-display text-2xl text-gold">{t("brand.name")}</span>
              <button onClick={() => setOpen(false)} className="text-cream"><X className="w-6 h-6" /></button>
            </div>
            <GoldDivider />
            <nav className="flex flex-col gap-4">
              {navItems.map((n) => (
                <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="text-lg uppercase tracking-widest text-cream hover:text-gold transition">
                    {n.label}
                  </Link>
              ))}
              {user ? (
                <>
                  <Link href={user.role === "admin" ? "/admin" : "/profile"} onClick={() => setOpen(false)} className="text-lg uppercase tracking-widest text-cream hover:text-gold">{t("nav.profile")}</Link>
                  <button onClick={() => { logout(); setOpen(false); }} className="text-start text-lg uppercase tracking-widest text-cream hover:text-gold">{t("nav.signOut")}</button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setOpen(false)} className="text-lg uppercase tracking-widest text-cream hover:text-gold">{t("nav.signIn")}</Link>
                  <Link href="/register" onClick={() => setOpen(false)} className="text-lg uppercase tracking-widest text-cream hover:text-gold">{t("nav.signUp")}</Link>
                </>
              )}
            </nav>
            <div className="mt-auto text-xs text-cream/60 space-y-2">
              <div className="flex items-center gap-2"><MapPin className="w-3 h-3" />{t("footer.address")}</div>
              <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{t("footer.phone")}</div>
              <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{t("footer.email")}</div>
            </div>
          </aside>
        </div>
      )}

      <main className="flex-1">{children}</main>

      <footer className="bg-charcoal text-cream pt-20 pb-8">
        <div className="max-w-[1400px] mx-auto px-5 md:px-10 grid md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <div className="font-display text-3xl text-gold mb-3">{t("brand.name")}</div>
            <p className="text-cream/70 max-w-md leading-relaxed">{t("footer.about")}</p>
          </div>
          <div>
            <h4 className="text-gold uppercase text-xs tracking-widest mb-4 font-bold">{t("footer.quickLinks")}</h4>
            <ul className="space-y-2 text-sm text-cream/70">
              {navItems.map((n) => (
                <li key={n.href}><Link href={n.href} className="hover:text-gold transition">{n.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-gold uppercase text-xs tracking-widest mb-4 font-bold">{t("footer.contactUs")}</h4>
            <ul className="space-y-3 text-sm text-cream/70">
              <li>
                <a
                  href="https://maps.app.goo.gl/D4vLa3s9dTWZjDYf9"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 hover:text-gold transition"
                  data-testid="link-footer-address"
                >
                  <MapPin className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
                  <span>{t("footer.address")}</span>
                </a>
              </li>
              <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-gold" />{t("footer.phone")}</li>
              <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-gold" />{t("footer.email")}</li>
            </ul>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto px-5 md:px-10 mt-10 pt-6 border-t border-cream/10 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-cream/50">
          <div>© {new Date().getFullYear()} {t("brand.name")}. {t("footer.rights")}.</div>
          <div className="font-display italic">{t("brand.tagline")}</div>
        </div>
      </footer>
    </div>
  );
}
