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
import { Check, Calendar as CalendarIcon, CreditCard, Building2, Banknote, Wallet } from "lucide-react";

type PayMethod = "card" | "mada" | "transfer" | "branch";

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
  const initialCheckIn = useQueryParam("checkIn");
  const initialCheckOut = useQueryParam("checkOut");
  const initialGuests = useQueryParam("guests");
  const { data: rooms } = useListRooms();
  const create = useCreateBooking();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [roomId, setRoomId] = useState<number | "">(initialRoomId ? Number(initialRoomId) : "");
  const [checkIn, setCheckIn] = useState(initialCheckIn || todayISO(1));
  const [checkOut, setCheckOut] = useState(initialCheckOut || todayISO(3));
  const [guests, setGuests] = useState(initialGuests ? Number(initialGuests) : 2);
  const [mode, setMode] = useState<"guest" | "account">(user ? "account" : "guest");
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [notes, setNotes] = useState("");
  const [payMethod, setPayMethod] = useState<PayMethod>("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
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
  function validateStep3(): string | null {
    if (payMethod === "card" || payMethod === "mada") {
      if (!cardNumber || cardNumber.replace(/\s/g, "").length < 12) return t("common.required");
      if (!cardName) return t("common.required");
      if (!cardExpiry || !/^\d{2}\/\d{2}$/.test(cardExpiry)) return t("common.required");
      if (!cardCvv || cardCvv.length < 3) return t("common.required");
    }
    return null;
  }

  async function submit() {
    setError(null);
    try {
      const payLabel =
        payMethod === "card" ? "Visa/Mastercard"
        : payMethod === "mada" ? "Mada"
        : payMethod === "transfer" ? "Bank Transfer"
        : "Pay at Branch";
      const composedNotes = `Payment: ${payLabel}${notes ? " | " + notes : ""}`;
      const res = await create.mutateAsync({
        data: {
          roomId: Number(roomId),
          checkIn,
          checkOut,
          guests,
          guestName: name,
          guestEmail: email,
          guestPhone: phone,
          notes: composedNotes,
        },
      });
      setReference(res.reference);
      qc.invalidateQueries({ queryKey: getListBookingsQueryKey() });
      setStep(4);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("common.error");
      setError(msg);
    }
  }

  if (step === 4 && reference) {
    return (
      <section className="confirm-hero min-h-screen pt-32 pb-20 px-5 flex items-center">
        {/* Floating sparks */}
        {Array.from({ length: 18 }).map((_, i) => {
          const left = (i * 53) % 100;
          const top = (i * 37) % 100;
          const delay = (i * 0.3) % 6;
          return (
            <span key={i} className="confirm-spark" style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${delay}s` }} />
          );
        })}
        <div className="max-w-2xl mx-auto text-center confirm-card p-12 relative z-10">
          <div className="confirm-check mx-auto mb-6">
            <Check className="w-12 h-12 text-charcoal" strokeWidth={3} />
          </div>
          <h1 className="font-display text-4xl text-charcoal mb-2">{t("booking.success")}</h1>
          <p className="text-charcoal/70 text-sm mt-2">{t("booking.successSub")}</p>
          <GoldDivider />
          <div className="mt-6 text-charcoal/70 text-xs uppercase tracking-widest">{t("booking.reference")}</div>
          <div className="mt-2 confirm-ref">
            <span className="font-display text-3xl text-gold tracking-widest">{reference}</span>
          </div>
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
            <Stepper step={step} t={t} />
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
                  <button onClick={() => { const v = validateStep2(); if (v) { setError(v); return; } setError(null); setStep(3); }} className="btn-gold flex-1">
                    {t("booking.continue")}
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <div className="label mb-3">{t("booking.payment")}</div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <PayTile active={payMethod === "card"} onClick={() => setPayMethod("card")} icon={<CreditCard className="w-5 h-5" />} title={t("booking.payCard")} desc={t("booking.payCardDesc")} />
                    <PayTile active={payMethod === "mada"} onClick={() => setPayMethod("mada")} icon={<Wallet className="w-5 h-5" />} title={t("booking.payMada")} desc={t("booking.payMadaDesc")} />
                    <PayTile active={payMethod === "transfer"} onClick={() => setPayMethod("transfer")} icon={<Building2 className="w-5 h-5" />} title={t("booking.payTransfer")} desc={t("booking.payTransferDesc")} />
                    <PayTile active={payMethod === "branch"} onClick={() => setPayMethod("branch")} icon={<Banknote className="w-5 h-5" />} title={t("booking.payBranch")} desc={t("booking.payBranchDesc")} />
                  </div>
                </div>

                {(payMethod === "card" || payMethod === "mada") && (
                  <div className="space-y-4 bg-cream/40 border border-cream-deep p-4">
                    <div>
                      <label className="label">{t("booking.cardNumber")}</label>
                      <input className="field" placeholder="•••• •••• •••• ••••" maxLength={19}
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim())}
                      />
                    </div>
                    <div>
                      <label className="label">{t("booking.cardName")}</label>
                      <input className="field" value={cardName} onChange={(e) => setCardName(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">{t("booking.cardExpiry")}</label>
                        <input className="field" placeholder="MM/YY" maxLength={5}
                          value={cardExpiry}
                          onChange={(e) => {
                            let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                            if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
                            setCardExpiry(v);
                          }}
                        />
                      </div>
                      <div>
                        <label className="label">{t("booking.cardCvv")}</label>
                        <input className="field" maxLength={4} value={cardCvv} onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))} />
                      </div>
                    </div>
                  </div>
                )}

                {payMethod === "transfer" && (
                  <div className="bg-cream/40 border border-cream-deep p-5 text-sm text-charcoal/80 space-y-2">
                    <div className="flex justify-between"><span className="text-charcoal/60">{t("booking.bankName")}:</span><span className="font-medium">SNB / البنك الأهلي</span></div>
                    <div className="flex justify-between"><span className="text-charcoal/60">{t("booking.iban")}:</span><span className="font-mono text-gold">SA00 0000 0000 0000 0000 0000</span></div>
                    <div className="text-xs text-charcoal/60 pt-2 border-t border-cream-deep">{t("booking.transferNote")}</div>
                  </div>
                )}

                {payMethod === "branch" && (
                  <div className="bg-cream/40 border border-cream-deep p-5 text-sm text-charcoal/80 flex items-start gap-3">
                    <Banknote className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                    <div>{t("booking.branchNote")}</div>
                  </div>
                )}

                {error && <div className="text-destructive text-sm">{error}</div>}
                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="btn-outline-gold">←</button>
                  <button
                    onClick={() => { const v = validateStep3(); if (v) { setError(v); return; } setError(null); submit(); }}
                    disabled={create.isPending}
                    className="btn-gold flex-1"
                  >
                    {create.isPending ? t("common.loading") : t("booking.payNow")}
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

function Stepper({ step, t }: { step: 1 | 2 | 3 | 4; t: (k: string) => string }) {
  const items: Array<{ n: number; label: string }> = [
    { n: 1, label: t("booking.steps.dates") },
    { n: 2, label: t("booking.steps.info") },
    { n: 3, label: t("booking.steps.pay") },
    { n: 4, label: t("booking.steps.done") },
  ];
  return (
    <div className="flex items-center justify-center gap-2 mt-6 text-xs uppercase tracking-widest">
      {items.map((it, i) => (
        <div key={it.n} className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 ${step >= (it.n as 1 | 2 | 3 | 4) ? "text-gold font-bold" : "text-charcoal/40"}`}>
            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full border ${step >= (it.n as 1 | 2 | 3 | 4) ? "bg-gold text-charcoal border-gold" : "border-charcoal/20"}`}>{it.n}</span>
            {it.label}
          </span>
          {i < items.length - 1 && <span className="text-charcoal/30">—</span>}
        </div>
      ))}
    </div>
  );
}

function PayTile({ active, onClick, icon, title, desc }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button type="button" onClick={onClick} className={`pay-tile ${active ? "active" : ""}`}>
      <span className="pay-tile-icon">{icon}</span>
      <span className="flex-1">
        <span className="block font-display text-base text-charcoal">{title}</span>
        <span className="block text-xs text-charcoal/60 mt-0.5">{desc}</span>
      </span>
      {active && <span className="text-gold"><Check className="w-4 h-4" /></span>}
    </button>
  );
}
