import { Link } from "wouter";
import { useAdminStats, useAdminBookingsTimeseries, useAdminRecentBookings } from "@workspace/api-client-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from "recharts";
import { useI18n } from "@/lib/i18n";
import { AdminLayout } from "@/components/AdminLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { CountUp } from "@/components/CountUp";
import { formatSAR } from "@/lib/utils";
import { BedDouble, BookOpenCheck, CircleDollarSign, BedSingle, Clock } from "lucide-react";

export default function AdminDashboard() {
  const { t } = useI18n();
  const { data: stats } = useAdminStats();
  const { data: series } = useAdminBookingsTimeseries();
  const { data: recent } = useAdminRecentBookings();

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl text-charcoal">{t("admin.dashboard")}</h1>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        <Stat icon={<BookOpenCheck className="w-5 h-5" />} label={t("admin.totalBookings")} value={stats?.totalBookings ?? 0} />
        <Stat icon={<CircleDollarSign className="w-5 h-5" />} label={t("admin.monthRevenue")} value={stats?.monthRevenue ?? 0} format="sar" />
        <Stat icon={<BedSingle className="w-5 h-5" />} label={t("admin.availableRooms")} value={stats?.availableRooms ?? 0} />
        <Stat icon={<BedDouble className="w-5 h-5" />} label={t("admin.occupiedRooms")} value={stats?.occupiedRooms ?? 0} />
        <Stat icon={<Clock className="w-5 h-5" />} label={t("admin.pendingBookings")} value={stats?.pendingBookings ?? 0} />
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-cream-deep p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl text-charcoal">{t("admin.bookingsTrend")}</h3>
          </div>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <AreaChart data={series ?? []}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C9A84C" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#C9A84C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDE3D2" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5b5b6b" }} tickFormatter={(s) => String(s).slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: "#5b5b6b" }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#C9A84C" fill="url(#g1)" />
                <Line type="monotone" dataKey="revenue" stroke="#8B6914" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white border border-cream-deep p-6">
          <h3 className="font-display text-xl text-charcoal mb-4">{t("admin.recentBookings")}</h3>
          <div className="space-y-3">
            {(recent ?? []).slice(0, 6).map((b) => (
              <div key={b.id} className="flex items-center justify-between text-sm border-b border-cream-deep pb-2 last:border-0">
                <div>
                  <div className="text-charcoal font-medium">{b.guestName}</div>
                  <div className="text-charcoal/60 text-xs">{b.roomName} · {b.checkIn}</div>
                </div>
                <div className="text-end">
                  <div className="text-gold font-bold">{formatSAR(b.totalPrice)}</div>
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

function Stat({ icon, label, value, format }: { icon: React.ReactNode; label: string; value: number; format?: "sar" }) {
  const { t } = useI18n();
  return (
    <div className="bg-white border border-cream-deep p-5">
      <div className="flex items-center justify-between mb-2 text-gold">{icon}</div>
      <div className="font-display text-3xl text-charcoal">
        {format === "sar" ? <><CountUp to={value} /> <span className="text-sm text-charcoal/60">{t("common.sar")}</span></> : <CountUp to={value} />}
      </div>
      <div className="text-xs uppercase tracking-widest text-charcoal/60 mt-1">{label}</div>
    </div>
  );
}
