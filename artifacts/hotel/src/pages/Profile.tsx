import { Redirect } from "wouter";
import { useListBookings, useUpdateBookingStatus, getListBookingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { GoldDivider } from "@/components/GoldDivider";
import { StatusBadge } from "@/components/StatusBadge";
import { formatSAR } from "@/lib/utils";

export default function Profile() {
  const { t } = useI18n();
  const { user, isLoading } = useAuth();
  const qc = useQueryClient();
  const { data: bookings } = useListBookings({ query: { queryKey: getListBookingsQueryKey(), enabled: !!user } });
  const update = useUpdateBookingStatus();

  if (isLoading) return <div className="pt-32 text-center text-charcoal/60">{t("common.loading")}</div>;
  if (!user) return <Redirect to="/login" />;

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (bookings ?? []).filter((b) => b.checkOut >= today && b.status !== "cancelled");
  const past = (bookings ?? []).filter((b) => b.checkOut < today || b.status === "cancelled");

  async function cancel(id: number) {
    await update.mutateAsync({ id, data: { status: "cancelled" } });
    qc.invalidateQueries({ queryKey: getListBookingsQueryKey() });
  }

  return (
    <section className="pt-28 pb-20 px-5 bg-cream min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-gold text-xs uppercase tracking-[0.3em] mb-2">{user.email}</div>
          <h1 className="font-display text-4xl text-charcoal">{user.name}</h1>
          <GoldDivider />
        </div>
        <Section title={t("profile.upcoming")}>
          {upcoming.length === 0 ? <Empty t={t} /> : upcoming.map((b) => (
            <BookingRow key={b.id} b={b} onCancel={() => cancel(b.id)} canCancel />
          ))}
        </Section>
        <Section title={t("profile.past")}>
          {past.length === 0 ? <Empty t={t} /> : past.map((b) => <BookingRow key={b.id} b={b} />)}
        </Section>
      </div>
    </section>
  );
}

function Empty({ t }: { t: (k: string) => string }) {
  return <div className="text-charcoal/60 italic text-center py-10 bg-white border border-cream-deep">{t("profile.noBookings")}</div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-12">
      <h2 className="font-display text-2xl text-charcoal mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

interface B {
  id: number; reference: string; roomName: string; checkIn: string; checkOut: string; nights?: number | null;
  guests: number; totalPrice: number; status: string;
}
function BookingRow({ b, onCancel, canCancel }: { b: B; onCancel?: () => void; canCancel?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="bg-white border border-cream-deep p-5 flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <span className="font-display text-xl text-charcoal">{b.roomName}</span>
          <StatusBadge status={b.status} />
        </div>
        <div className="text-sm text-charcoal/70">
          <span className="text-gold font-bold tracking-widest">{b.reference}</span> · {b.checkIn} → {b.checkOut} · {b.nights ?? 1} {t("booking.nights")} · {b.guests} {t("rooms.guests")}
        </div>
      </div>
      <div className="text-end">
        <div className="text-xs uppercase tracking-widest text-charcoal/60">{t("booking.total")}</div>
        <div className="font-display text-2xl text-gold">{formatSAR(b.totalPrice)} {t("common.sar")}</div>
      </div>
      {canCancel && (b.status === "pending" || b.status === "confirmed") && (
        <button onClick={onCancel} className="btn-outline-gold !py-2 !px-4 !text-xs">{t("profile.cancel")}</button>
      )}
    </div>
  );
}
