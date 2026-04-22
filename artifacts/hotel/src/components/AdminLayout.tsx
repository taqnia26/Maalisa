import { Link, useLocation, Redirect } from "wouter";
import type { ReactNode } from "react";
import { LayoutDashboard, BedDouble, CalendarDays, Users, Settings, LogOut, Globe, BookOpenCheck, Wallet } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

export function AdminLayout({ children }: { children: ReactNode }) {
  const { t, toggle } = useI18n();
  const { user, isLoading, logout } = useAuth();
  const [loc] = useLocation();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-charcoal text-cream">{t("common.loading")}</div>;
  if (!user || user.role !== "admin") return <Redirect to="/admin/login" />;

  const items = [
    { href: "/admin", label: t("admin.dashboard"), icon: LayoutDashboard },
    { href: "/admin/rooms", label: t("admin.rooms"), icon: BedDouble },
    { href: "/admin/bookings", label: t("admin.bookings"), icon: BookOpenCheck },
    { href: "/admin/finance", label: t("admin.finance"), icon: Wallet },
    { href: "/admin/guests", label: t("admin.guests"), icon: Users },
    { href: "/admin/calendar", label: t("admin.calendar"), icon: CalendarDays },
    { href: "/admin/settings", label: t("admin.settings"), icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-cream">
      <aside className="w-64 bg-charcoal text-cream flex flex-col fixed inset-y-0 ltr:left-0 rtl:right-0 z-40 hidden md:flex">
        <Link href="/admin" className="px-6 py-6 border-b border-cream/10">
            <div className="font-display text-2xl text-gold">{t("brand.name")}</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-cream/60 mt-1">{t("admin.title")}</div>
          </Link>
        <nav className="flex-1 py-4">
          {items.map((it) => {
            const active = loc === it.href || (it.href !== "/admin" && loc.startsWith(it.href));
            const Icon = it.icon;
            return (
              <Link key={it.href} href={it.href} className={`flex items-center gap-3 px-6 py-3 text-sm transition border-l-2 ltr:border-l-2 rtl:border-l-0 rtl:border-r-2
                  ${active ? "bg-cream/5 text-gold border-gold" : "text-cream/80 border-transparent hover:text-gold hover:bg-cream/5"}`}>
                  <Icon className="w-4 h-4" />
                  <span>{it.label}</span>
                </Link>
            );
          })}
        </nav>
        <div className="border-t border-cream/10 p-4 space-y-2">
          <button onClick={toggle} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-cream/80 hover:text-gold">
            <Globe className="w-4 h-4" />{t("lang.toggle")}
          </button>
          <Link href="/" className="block text-xs px-3 py-1 text-cream/60 hover:text-gold">{t("brand.name")} →</Link>
          <button onClick={() => logout()} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-cream/80 hover:text-gold">
            <LogOut className="w-4 h-4" />{t("nav.signOut")}
          </button>
        </div>
      </aside>
      <div className="flex-1 ltr:md:ml-64 rtl:md:mr-64 min-h-screen">
        <header className="md:hidden bg-charcoal text-cream px-5 py-4 flex items-center justify-between">
          <span className="font-display text-xl text-gold">{t("admin.title")}</span>
          <button onClick={() => logout()} className="text-cream/80"><LogOut className="w-5 h-5" /></button>
        </header>
        <nav className="md:hidden flex overflow-x-auto no-scrollbar bg-charcoal/90 text-cream gap-2 px-3 py-2">
          {items.map((it) => {
            const active = loc === it.href || (it.href !== "/admin" && loc.startsWith(it.href));
            return (
              <Link key={it.href} href={it.href} className={`text-xs px-3 py-1 whitespace-nowrap ${active ? "text-gold border-b border-gold" : "text-cream/70"}`}>{it.label}</Link>
            );
          })}
        </nav>
        <div className="p-5 md:p-10">{children}</div>
      </div>
    </div>
  );
}
