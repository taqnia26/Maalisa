import { useMemo } from "react";
import { Link } from "wouter";
import { useAdminStats, useAdminBookingsTimeseries, useAdminRecentBookings, useListBookings } from "@workspace/api-client-react";
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart, PieChart, Pie, Cell, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { useI18n } from "@/lib/i18n";
import { AdminLayout } from "@/components/AdminLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUS_I18N_KEYS } from "./Bookings";
import { CountUp } from "@/components/CountUp";
import { formatSAR } from "@/lib/utils";
import { BedDouble, BookOpenCheck, CircleDollarSign, BedSingle, Clock, TrendingUp, Wallet } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "#D9A441",
  confirmed: "#C9A84C",
  checked_in: "#2E7D32",
  checked_out: "#1A1A2E",
  cancelled: "#C62828",
};

export default function AdminDashboard() {
  const { t } = useI18n();
  const { data: stats } = useAdminStats();
  const { data: series } = useAdminBookingsTimeseries();
  const { data: recent } = useAdminRecentBookings();
  const { data: bookings } = useListBookings();

  const computed = useMemo(() => {
    const list = bookings ?? [];
    const totalRooms = (stats?.availableRooms ?? 0) + (stats?.occupiedRooms ?? 0);
    const occupancy = totalRooms > 0 ? Math.round(((stats?.occupiedRooms ?? 0) / totalRooms) * 100) : 0;
    const revenue30 = (series ?? []).reduce((s, p) => s + Number((p as { revenue?: number }).revenue ?? 0), 0);
    const statusCounts: Record<string, number> = {};
    for (const b of list) statusCounts[b.status] = (statusCounts[b.status] ?? 0) + 1;
    const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
    return { occupancy, revenue30, statusData };
  }, [bookings, stats, series]);

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl text-charcoal">{t("admin.dashboard")}</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Stat icon={<BookOpenCheck className="w-5 h-5" />} label={t("admin.totalBookings")} value={stats?.totalBookings ?? 0} />
        <Stat icon={<CircleDollarSign className="w-5 h-5" />} label={t("admin.monthRevenue")} value={stats?.monthRevenue ?? 0} format="sar" accent />
        <Stat icon={<BedSingle className="w-5 h-5" />} label={t("admin.availableRooms")} value={stats?.availableRooms ?? 0} />
        <Stat icon={<BedDouble className="w-5 h-5" />} label={t("admin.occupiedRooms")} value={stats?.occupiedRooms ?? 0} />
        <Stat icon={<Clock className="w-5 h-5" />} label={t("admin.pendingBookings")} value={stats?.pendingBookings ?? 0} />
      </div>

      {/* Main charts row */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Trend area+bar combo */}
        <div className="lg:col-span-2 bg-white border border-cream-deep p-6 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-gold/5 blur-3xl" />
          <div className="flex items-center justify-between mb-4 relative">
            <div>
              <h3 className="font-display text-xl text-charcoal">{t("admin.bookingsTrend")}</h3>
              <div className="text-xs text-charcoal/60 mt-0.5 flex items-center gap-3">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-gold rounded-full" />{t("admin.dash.bookings30")}</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-charcoal rounded-full" />{t("admin.dash.revenue30")}</span>
              </div>
            </div>
            <div className="text-end">
              <div className="font-display text-2xl text-gold" dir="ltr">{formatSAR(computed.revenue30)}</div>
              <div className="text-[10px] uppercase tracking-widest text-charcoal/60">SAR · 30D</div>
            </div>
          </div>
          <div style={{ width: "100%", height: 300 }} dir="ltr">
            <ResponsiveContainer>
              <AreaChart data={series ?? []} margin={{ left: -10, right: 10 }}>
                <defs>
                  <linearGradient id="dashGold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C9A84C" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#C9A84C" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="dashRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1A1A2E" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#1A1A2E" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDE3D2" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5b5b6b" }} tickFormatter={(s) => String(s).slice(5)} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#5b5b6b" }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#5b5b6b" }} tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "#1A1A2E", border: "1px solid #C9A84C", color: "#F5F0E8", borderRadius: 0 }} labelStyle={{ color: "#C9A84C" }} />
                <Area yAxisId="right" type="monotone" dataKey="revenue" stroke="#1A1A2E" strokeWidth={1.5} fill="url(#dashRev)" />
                <Area yAxisId="left" type="monotone" dataKey="count" stroke="#C9A84C" strokeWidth={2.5} fill="url(#dashGold)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Occupancy radial */}
        <div className="bg-charcoal text-cream p-6 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gold/15 blur-3xl" />
          <div className="flex items-center gap-2 mb-3 text-gold relative"><TrendingUp className="w-4 h-4" /><h3 className="font-display text-xl">{t("admin.dash.occupancy")}</h3></div>
          <div style={{ width: "100%", height: 220 }} dir="ltr" className="relative">
            <ResponsiveContainer>
              <RadialBarChart innerRadius="65%" outerRadius="95%" data={[{ name: "occ", value: computed.occupancy, fill: "#C9A84C" }]} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={20} background={{ fill: "rgba(255,255,255,0.08)" }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="font-display text-5xl text-gold" dir="ltr">{computed.occupancy}%</div>
              <div className="text-[10px] uppercase tracking-widest text-cream/60 mt-1" dir="ltr">{stats?.occupiedRooms ?? 0} / {(stats?.availableRooms ?? 0) + (stats?.occupiedRooms ?? 0)}</div>
            </div>
          </div>
          <Link href="/admin/finance" className="block text-center text-xs uppercase tracking-widest text-gold hover:underline mt-3 flex items-center justify-center gap-1.5"><Wallet className="w-3 h-3" />{t("admin.finance.title")}</Link>
        </div>
      </div>

      {/* Status breakdown + Recent */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white border border-cream-deep p-6">
          <h3 className="font-display text-xl text-charcoal mb-4">{t("admin.dash.statusBreakdown")}</h3>
          <div style={{ width: "100%", height: 220 }} dir="ltr">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={computed.statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {computed.statusData.map((s) => <Cell key={s.name} fill={STATUS_COLORS[s.name] ?? "#C9A84C"} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#1A1A2E", border: "1px solid #C9A84C", color: "#F5F0E8", borderRadius: 0 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
            {computed.statusData.map((s) => (
              <div key={s.name} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-sm" style={{ background: STATUS_COLORS[s.name] }} />
                <span className="text-charcoal/70 flex-1">{t(STATUS_I18N_KEYS[s.name] ?? s.name)}</span>
                <span className="text-charcoal font-bold" dir="ltr">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-cream-deep p-6">
          <h3 className="font-display text-xl text-charcoal mb-4">{t("admin.bookings")}</h3>
          <div style={{ width: "100%", height: 220 }} dir="ltr">
            <ResponsiveContainer>
              <BarChart data={(series ?? []).slice(-14)} margin={{ left: -10, right: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDE3D2" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#5b5b6b" }} tickFormatter={(s) => String(s).slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: "#5b5b6b" }} />
                <Tooltip contentStyle={{ background: "#1A1A2E", border: "1px solid #C9A84C", color: "#F5F0E8", borderRadius: 0 }} />
                <Bar dataKey="count" fill="#C9A84C" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-cream-deep p-6">
          <h3 className="font-display text-xl text-charcoal mb-4">{t("admin.recentBookings")}</h3>
          <div className="space-y-3">
            {(recent ?? []).slice(0, 6).map((b) => (
              <div key={b.id} className="flex items-center justify-between text-sm border-b border-cream-deep pb-2 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="text-charcoal font-medium truncate">{b.guestName}</div>
                  <div className="text-charcoal/60 text-xs truncate" dir="ltr">{b.roomName} · {b.checkIn}</div>
                </div>
                <div className="text-end shrink-0 ms-2">
                  <div className="text-gold font-bold" dir="ltr">{formatSAR(b.totalPrice)}</div>
                  <StatusBadge status={b.status} />
                </div>
              </div>
            ))}
            {(!recent || recent.length === 0) && <div className="text-charcoal/50 text-sm italic">—</div>}
          </div>
          <Link href="/admin/bookings" className="btn-outline-gold w-full !py-2 !text-xs mt-4">{t("admin.bookings")}</Link>
        </div>
      </div>
    </AdminLayout>
  );
}

function Stat({ icon, label, value, format, accent }: { icon: React.ReactNode; label: string; value: number; format?: "sar"; accent?: boolean }) {
  return (
    <div className={`relative overflow-hidden p-5 border ${accent ? "bg-gradient-to-br from-charcoal to-charcoal-soft text-cream border-gold" : "bg-white border-cream-deep"}`}>
      <div className="flex items-center justify-between mb-2 text-gold">{icon}</div>
      <div className={`font-display text-3xl ${accent ? "text-gold" : "text-charcoal"}`}>
        {format === "sar" ? <><CountUp to={value} /> <span className={`text-sm ${accent ? "text-cream/60" : "text-charcoal/60"}`}>SAR</span></> : <CountUp to={value} />}
      </div>
      <div className={`text-xs uppercase tracking-widest mt-1 ${accent ? "text-cream/70" : "text-charcoal/60"}`}>{label}</div>
      {accent && <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-gold/15 blur-2xl" />}
    </div>
  );
}
