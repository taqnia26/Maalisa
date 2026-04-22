import { useMemo } from "react";
import { useListBookings } from "@workspace/api-client-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import { useI18n } from "@/lib/i18n";
import { AdminLayout } from "@/components/AdminLayout";
import { CountUp } from "@/components/CountUp";
import { formatSAR } from "@/lib/utils";
import { Wallet, TrendingUp, BadgeDollarSign, CreditCard } from "lucide-react";

const METHOD_COLORS: Record<string, string> = {
  "Visa/Mastercard": "#C9A84C",
  Mada: "#8B6914",
  "Bank Transfer": "#1A1A2E",
  "Pay at Branch": "#5b5b6b",
  Other: "#a89368",
};

function detectMethod(notes: string | null | undefined): string {
  if (!notes) return "Other";
  const n = notes.toLowerCase();
  if (n.includes("visa") || n.includes("mastercard") || n.includes("card")) return "Visa/Mastercard";
  if (n.includes("mada")) return "Mada";
  if (n.includes("transfer") || n.includes("تحويل")) return "Bank Transfer";
  if (n.includes("branch") || n.includes("فرع")) return "Pay at Branch";
  return "Other";
}

export default function AdminFinance() {
  const { t, language } = useI18n();
  const { data: bookings } = useListBookings();

  const stats = useMemo(() => {
    const list = bookings ?? [];
    const total = list.reduce((s, b) => s + Number(b.totalPrice ?? 0), 0);
    const confirmed = list.filter((b) => b.status === "confirmed" || b.status === "checked_in" || b.status === "checked_out").reduce((s, b) => s + Number(b.totalPrice ?? 0), 0);
    const pending = list.filter((b) => b.status === "pending").reduce((s, b) => s + Number(b.totalPrice ?? 0), 0);
    const avg = list.length > 0 ? total / list.length : 0;
    const now = new Date();
    const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const month = list.filter((b) => b.checkIn?.startsWith(ym)).reduce((s, b) => s + Number(b.totalPrice ?? 0), 0);

    // by method
    const byMethodMap: Record<string, number> = {};
    for (const b of list) {
      const m = detectMethod(b.notes);
      byMethodMap[m] = (byMethodMap[m] ?? 0) + Number(b.totalPrice ?? 0);
    }
    const byMethod = Object.entries(byMethodMap).map(([name, value]) => ({ name, value }));

    // by room
    const byRoomMap: Record<string, number> = {};
    for (const b of list) {
      const k = b.roomName ?? "—";
      byRoomMap[k] = (byRoomMap[k] ?? 0) + Number(b.totalPrice ?? 0);
    }
    const byRoom = Object.entries(byRoomMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

    // monthly trend (last 6 months)
    const monthly: Array<{ month: string; revenue: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getUTCFullYear(), now.getUTCMonth() - i, 1);
      const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      const rev = list.filter((b) => b.checkIn?.startsWith(k)).reduce((s, b) => s + Number(b.totalPrice ?? 0), 0);
      monthly.push({ month: k.slice(2), revenue: rev });
    }

    // recent payments
    const recent = [...list].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")).slice(0, 8);

    return { total, confirmed, pending, avg, month, byMethod, byRoom, monthly, recent };
  }, [bookings]);

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl text-charcoal">{t("admin.finance.title")}</h1>
        <div className="text-charcoal/60 text-sm mt-1">{t("admin.finance")}</div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPI icon={<BadgeDollarSign className="w-5 h-5" />} label={t("admin.finance.totalRevenue")} value={stats.total} />
        <KPI icon={<TrendingUp className="w-5 h-5" />} label={t("admin.finance.monthRevenue")} value={stats.month} />
        <KPI icon={<Wallet className="w-5 h-5" />} label={t("admin.finance.confirmedRevenue")} value={stats.confirmed} accent />
        <KPI icon={<CreditCard className="w-5 h-5" />} label={t("admin.finance.avgBooking")} value={Math.round(stats.avg)} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Monthly trend */}
        <div className="lg:col-span-2 bg-white border border-cream-deep p-6">
          <h3 className="font-display text-xl text-charcoal mb-4">{t("admin.finance.monthlyTrend")}</h3>
          <div style={{ width: "100%", height: 300 }} dir="ltr">
            <ResponsiveContainer>
              <AreaChart data={stats.monthly}>
                <defs>
                  <linearGradient id="finG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C9A84C" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#C9A84C" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDE3D2" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5b5b6b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#5b5b6b" }} tickFormatter={(v) => formatSAR(Number(v))} width={70} />
                <Tooltip formatter={(v) => `${formatSAR(Number(v))} SAR`} contentStyle={{ background: "#1A1A2E", border: "1px solid #C9A84C", color: "#F5F0E8", borderRadius: 0 }} labelStyle={{ color: "#C9A84C" }} />
                <Area type="monotone" dataKey="revenue" stroke="#C9A84C" strokeWidth={2.5} fill="url(#finG)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By method (donut) */}
        <div className="bg-white border border-cream-deep p-6">
          <h3 className="font-display text-xl text-charcoal mb-4">{t("admin.finance.byMethod")}</h3>
          <div style={{ width: "100%", height: 300 }} dir="ltr">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={stats.byMethod} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {stats.byMethod.map((entry) => <Cell key={entry.name} fill={METHOD_COLORS[entry.name] ?? "#C9A84C"} />)}
                </Pie>
                <Tooltip formatter={(v) => `${formatSAR(Number(v))} SAR`} contentStyle={{ background: "#1A1A2E", border: "1px solid #C9A84C", color: "#F5F0E8", borderRadius: 0 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* By room (bar) */}
        <div className="lg:col-span-2 bg-white border border-cream-deep p-6">
          <h3 className="font-display text-xl text-charcoal mb-4">{t("admin.finance.byRoom")}</h3>
          <div style={{ width: "100%", height: 320 }} dir="ltr">
            <ResponsiveContainer>
              <BarChart data={stats.byRoom} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDE3D2" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#5b5b6b" }} tickFormatter={(v) => formatSAR(Number(v))} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#1A1A2E" }} width={140} />
                <Tooltip formatter={(v) => `${formatSAR(Number(v))} SAR`} contentStyle={{ background: "#1A1A2E", border: "1px solid #C9A84C", color: "#F5F0E8", borderRadius: 0 }} />
                <Bar dataKey="value" fill="#C9A84C" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent payments */}
        <div className="bg-white border border-cream-deep p-6">
          <h3 className="font-display text-xl text-charcoal mb-4">{t("admin.finance.recentPayments")}</h3>
          <div className="space-y-2.5">
            {stats.recent.map((b) => {
              const m = detectMethod(b.notes);
              return (
                <div key={b.id} className="flex items-center justify-between text-sm border-b border-cream-deep pb-2 last:border-0">
                  <div>
                    <div className="text-charcoal font-medium truncate max-w-[140px]" title={b.guestName}>{b.guestName}</div>
                    <div className="text-charcoal/55 text-[11px]" dir="ltr">{b.checkIn}</div>
                    <span className="inline-block mt-1 text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm" style={{ background: `${METHOD_COLORS[m] ?? "#C9A84C"}22`, color: METHOD_COLORS[m] ?? "#8B6914" }}>{m}</span>
                  </div>
                  <div className="text-end">
                    <div className="text-gold font-bold" dir="ltr">{formatSAR(Number(b.totalPrice))}</div>
                    <div className="text-[10px] uppercase tracking-widest text-charcoal/50">{language === "ar" ? "ر.س" : "SAR"}</div>
                  </div>
                </div>
              );
            })}
            {stats.recent.length === 0 && <div className="text-charcoal/50 text-sm italic">—</div>}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function KPI({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: boolean }) {
  return (
    <div className={`relative overflow-hidden p-5 border ${accent ? "bg-charcoal text-cream border-gold" : "bg-white border-cream-deep"}`}>
      <div className={`flex items-center justify-between mb-2 ${accent ? "text-gold" : "text-gold"}`}>{icon}</div>
      <div className={`font-display text-3xl ${accent ? "text-gold" : "text-charcoal"}`}>
        <CountUp to={value} /> <span className={`text-sm ${accent ? "text-cream/60" : "text-charcoal/60"}`}>SAR</span>
      </div>
      <div className={`text-xs uppercase tracking-widest mt-1 ${accent ? "text-cream/70" : "text-charcoal/60"}`}>{label}</div>
      {accent && <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-gold/10 blur-2xl" />}
    </div>
  );
}
