import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useListRooms, useCreateBooking, getListBookingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { GoldDivider } from "@/components/GoldDivider";
import { Reveal } from "@/components/Reveal";
import { formatSAR, nightsBetween, todayISO } from "@/lib/utils";
import { pickImage } from "@/lib/images";
import { Check, Calendar as CalendarIcon } from "lucide-react";

function useQueryParam(name: string): string | null {
  const [search] = useLocation();
  void search;
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

export default function BookingPage() {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const initialRoomId = useQueryParam("roomId");
  const { data: rooms } = useListRooms();
  const create = useCreateBooking();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [roomId, setRoomId] = useState<number | "">(initialRoomId ? Number(initialRoomId) : "");
  const [checkIn, setCheckIn] = useState(todayISO(1));
  const [checkOut, setCheckOut] = useState(todayISO(3));
  const [guests, setGuests] = useState(2);
  const [mode, setMode] = useState<"guest" | "account">(user ? "account" : "guest");
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setMode("account");
      setName(user.name);
      setEmail(user.email);
      if (user.phone) setPhone(user.phone);
    }
  }, [user]);

  const room = useMemo(() => (rooms ?? []).find((r) => r.id === Number(roomId)), [rooms, roomId]);
  const nights = nightsBetween(checkIn, checkOut);
  const total = room ? Number(room.price) * nights : 0;

  function validateStep1(): string | null {
    if (!roomId) return t("common.required");
    if (!checkIn || !checkOut) return t("common.required");
    if (new Date(checkOut) <= new Date(checkIn)) return t("common.dateInvalid");
    if (guests < 1) return t("common.required");
    return null;
  }
  function validateStep2(): string | null {
    if (!name || !email || !phone) return t("common.required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return t("common.invalidEmail");
    return null;
  }

  async function submit() {
    setError(null);
    try {
      const res = await create.mutateAsync({
        data: {
          roomId: Number(roomId),
          checkIn,
          checkOut,
          guests,
          guestName: name,
          guestEmail: email,
          guestPhone: phone,
          notes: notes || undefined,
        },
      });
      setReference(res.reference);
      qc.invalidateQueries({ queryKey: getListBookingsQueryKey() });
      setStep(3);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("common.error");
      setError(msg);
    }
  }

  if (step === 3 && reference) {
    return (
      <section className="min-h-screen pt-32 pb-20 px-5 bg-cream flex items-center">
        <div className="max-w-2xl mx-auto text-center bg-white border border-cream-deep p-12 shadow-md">
          <div className="w-20 h-20 mx-auto rounded-full border-2 border-gold flex items-center justify-center mb-6">
            <Check className="w-10 h-10 text-gold" />
          </div>
          <h1 className="font-display text-4xl text-charcoal mb-2">{t("booking.success")}</h1>
          <GoldDivider />
          <div className="mt-6 text-charcoal/70">{t("booking.reference")}</div>
          <div className="font-display text-3xl text-gold mt-1 tracking-widest">{reference}</div>
          <div className="mt-8 text-sm text-charcoal/70 grid grid-cols-2 gap-4">
            <div><div className="text-xs uppercase tracking-widest text-charcoal/50">{t("booking.checkIn")}</div><div className="font-medium">{checkIn}</div></div>
            <div><div className="text-xs uppercase tracking-widest text-charcoal/50">{t("booking.checkOut")}</div><div className="font-medium">{checkOut}</div></div>
            <div><div className="text-xs uppercase tracking-widest text-charcoal/50">{t("booking.guests")}</div><div className="font-medium">{guests}</div></div>
            <div><div className="text-xs uppercase tracking-widest text-charcoal/50">{t("booking.total")}</div><div className="font-medium text-gold">{formatSAR(total)} {t("common.sar")}</div></div>
          </div>
          <div className="flex items-center justify-center gap-3 mt-10">
            <Link href="/profile" className="btn-outline-gold">{t("booking.viewBookings")}</Link>
            <Link href="/" className="btn-gold">{t("common.backHome")}</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-28 pb-20 px-5 bg-cream min-h-screen">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="text-center mb-10">
            <div className="text-gold text-xs uppercase tracking-[0.3em] mb-2">{t("nav.bookNow")}</div>
            <h1 className="font-display text-4xl md:text-5xl text-charcoal">{t("booking.title")}</h1>
            <GoldDivider />
            <div className="flex items-center justify-center gap-2 mt-6 text-xs uppercase tracking-widest text-charcoal/60">
              <span className={step >= 1 ? "text-gold font-bold" : ""}>1 {t("booking.title")}</span>
              <span>—</span>
              <span className={step >= 2 ? "text-gold font-bold" : ""}>2 {t("booking.guestInfo")}</span>
              <span>—</span>
              <span className={step >= 3 ? "text-gold font-bold" : ""}>3 {t("booking.confirm")}</span>
            </div>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 bg-white border border-cream-deep p-8">
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="label">{t("booking.room")}</label>
                  <select className="field" value={roomId} onChange={(e) => setRoomId(e.target.value ? Number(e.target.value) : "")}>
                    <option value="">—</option>
                    {(rooms ?? []).map((r) => (
                      <option key={r.id} value={r.id}>
                        {language === "ar" ? r.nameAr : r.name} — {formatSAR(r.price)} {t("common.sar")}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t("booking.checkIn")}</label>
                    <input type="date" min={todayISO(0)} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="field" />
                  </div>
                  <div>
                    <label className="label">{t("booking.checkOut")}</label>
                    <input type="date" min={checkIn || todayISO(1)} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="field" />
                  </div>
                </div>
                <div>
                  <label className="label">{t("booking.guests")}</label>
                  <input type="number" min={1} max={room?.capacity ?? 8} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="field" />
                </div>
                {error && <div className="text-destructive text-sm">{error}</div>}
                <button
                  onClick={() => { const v = validateStep1(); if (v) setError(v); else { setError(null); setStep(2); } }}
                  className="btn-gold w-full"
                >
                  {t("booking.continue")}
                </button>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <button onClick={() => setMode("guest")} className={`flex-1 py-2 text-sm uppercase tracking-widest font-bold border ${mode === "guest" ? "bg-gold text-charcoal border-gold" : "border-charcoal/20 hover:border-gold"}`}>{t("booking.bookAsGuest")}</button>
                  {!user && <Link href={`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`} className={`flex-1 py-2 text-sm uppercase tracking-widest font-bold border text-center ${mode === "account" ? "bg-gold text-charcoal border-gold" : "border-charcoal/20 hover:border-gold"}`}>{t("booking.bookSignedIn")}</Link>}
                  {user && <button onClick={() => setMode("account")} className={`flex-1 py-2 text-sm uppercase tracking-widest font-bold border ${mode === "account" ? "bg-gold text-charcoal border-gold" : "border-charcoal/20 hover:border-gold"}`}>{user.name}</button>}
                </div>
                <div>
                  <label className="label">{t("booking.fullName")}</label>
                  <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">{t("booking.email")}</label><input type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div><label className="label">{t("booking.phone")}</label><input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                </div>
                <div><label className="label">{t("booking.notes")}</label><textarea className="field" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
                {error && <div className="text-destructive text-sm">{error}</div>}
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="btn-outline-gold">←</button>
                  <button onClick={() => { const v = validateStep2(); if (v) { setError(v); return; } setError(null); submit(); }} disabled={create.isPending} className="btn-gold flex-1">
                    {create.isPending ? t("common.loading") : t("booking.confirm")}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <aside className="bg-charcoal text-cream p-8">
            <div className="text-gold text-xs uppercase tracking-[0.3em] mb-3">{t("booking.summary")}</div>
            {room ? (
              <>
                <img src={room.images[0] ?? pickImage(0)} alt="" className="w-full h-44 object-cover mb-4" />
                <div className="font-display text-2xl text-cream">{language === "ar" ? room.nameAr : room.name}</div>
                <div className="text-cream/60 text-xs uppercase tracking-widest mt-1">{t(`type.${room.type}`)}</div>
                <div className="my-5 h-px bg-cream/15" />
                <div className="space-y-2 text-sm text-cream/80">
                  <div className="flex justify-between"><span className="flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5 text-gold" />{t("booking.checkIn")}</span><span>{checkIn}</span></div>
                  <div className="flex justify-between"><span className="flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5 text-gold" />{t("booking.checkOut")}</span><span>{checkOut}</span></div>
                  <div className="flex justify-between"><span>{t("booking.guests")}</span><span>{guests}</span></div>
                  <div className="flex justify-between"><span>{nights} × {formatSAR(Number(room.price))} {t("common.sar")}</span><span>{formatSAR(total)}</span></div>
                </div>
                <div className="my-5 h-px bg-cream/15" />
                <div className="flex justify-between items-baseline">
                  <span className="text-cream/70 uppercase tracking-widest text-xs">{t("booking.total")}</span>
                  <span className="font-display text-3xl text-gold">{formatSAR(total)} <span className="text-sm text-cream/70">{t("common.sar")}</span></span>
                </div>
              </>
            ) : (
              <div className="text-cream/60 text-sm">{t("booking.room")}</div>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
