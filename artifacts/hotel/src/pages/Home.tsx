import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useListRooms } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { hotelImages, pickImage } from "@/lib/images";
import { Particles } from "@/components/Particles";
import { Reveal } from "@/components/Reveal";
import { GoldDivider } from "@/components/GoldDivider";
import { CountUp } from "@/components/CountUp";
import { RoomCard } from "@/components/RoomCard";
import { AmenityIcon } from "@/components/AmenityIcon";
import { Star, ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, X } from "lucide-react";

const SLIDES = [0, 1, 2];

export default function Home() {
  const { t, isRtl } = useI18n();
  const { data: rooms } = useListRooms();
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 5000);
    return () => clearInterval(id);
  }, [paused]);

  const featured = (rooms ?? []).slice(0, 3);

  // Parallax on hero
  useEffect(() => {
    const onScroll = () => {
      const el = document.getElementById("hero-parallax");
      if (el) el.style.transform = `translateY(${window.scrollY * 0.4}px)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* HERO */}
      <section
        className="relative h-screen overflow-hidden bg-charcoal"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div id="hero-parallax" className="absolute inset-0">
          {SLIDES.map((s, i) => (
            <div key={i} className={`slide ${slide === i ? "active" : ""}`}>
              <div className="slide-img" style={{ backgroundImage: `url(${pickImage(s)})` }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(26,26,46,0.30), rgba(26,26,46,0.65))" }} />
            </div>
          ))}
        </div>
        <Particles />
        <div className="relative z-10 h-full flex items-center justify-center text-center text-cream px-5">
          <div className="max-w-4xl">
            <div className="text-gold text-xs uppercase tracking-[0.4em] mb-6">
              {[...t(`hero.slide${slide + 1}.kicker`)].map((c, i) => (
                <span key={`${slide}-k-${i}`} className="hero-word" style={{ animationDelay: `${0.1 + i * 0.02}s` }}>{c}</span>
              ))}
            </div>
            <h1 className="font-display text-5xl md:text-7xl text-cream leading-tight mb-6">
              {t(`hero.slide${slide + 1}.title`).split(" ").map((w, i) => (
                <span key={`${slide}-${i}`} className="hero-word me-3" style={{ animationDelay: `${0.3 + i * 0.08}s` }}>{w}</span>
              ))}
            </h1>
            <p className="text-cream/80 text-lg md:text-xl max-w-2xl mx-auto mb-10 hero-word" style={{ animationDelay: "0.9s" }}>
              {t(`hero.slide${slide + 1}.sub`)}
            </p>
            <div className="flex items-center justify-center gap-4 hero-word" style={{ animationDelay: "1.1s" }}>
              <Link href="/booking" className="btn-gold">{t("hero.cta.book")}</Link>
              <Link href="/rooms" className="btn-outline-gold !text-cream !border-cream/60 hover:!bg-cream hover:!text-charcoal hover:!border-cream">{t("hero.cta.explore")}</Link>
            </div>
          </div>
        </div>
        {/* Slide controls */}
        <button onClick={() => setSlide((s) => (s - 1 + SLIDES.length) % SLIDES.length)} className="absolute top-1/2 -translate-y-1/2 ltr:left-6 rtl:right-6 z-20 text-cream/80 hover:text-gold p-3 transition" aria-label="prev">
          {isRtl ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
        </button>
        <button onClick={() => setSlide((s) => (s + 1) % SLIDES.length)} className="absolute top-1/2 -translate-y-1/2 ltr:right-6 rtl:left-6 z-20 text-cream/80 hover:text-gold p-3 transition" aria-label="next">
          {isRtl ? <ChevronLeft className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
        </button>
        <div className="absolute bottom-8 inset-x-0 z-20 flex items-center justify-center gap-3">
          {SLIDES.map((s) => (
            <button key={s} onClick={() => setSlide(s)} className={`h-1 transition-all ${slide === s ? "w-12 bg-gold" : "w-6 bg-cream/40"}`} aria-label={`slide ${s + 1}`} />
          ))}
        </div>
        {/* progress bar */}
        <div className="absolute bottom-0 inset-x-0 h-[2px] bg-cream/10 z-20">
          <div key={`${slide}-${paused}`} className="h-full bg-gold" style={{ animation: paused ? "none" : "progress 5s linear forwards" }} />
        </div>
        <style>{`@keyframes progress { from { width:0% } to { width:100% } }`}</style>
      </section>

      {/* WELCOME */}
      <section className="py-24 px-5">
        <div className="max-w-[1200px] mx-auto grid md:grid-cols-2 gap-12 items-center">
          <Reveal>
            <div className="relative">
              <img src={pickImage(3)} alt="" className="w-full h-[520px] object-cover" />
              <div className="absolute -bottom-6 ltr:-right-6 rtl:-left-6 bg-gold text-charcoal p-6 max-w-[220px] hidden md:block">
                <div className="font-display text-3xl">2026</div>
                <div className="text-xs uppercase tracking-widest mt-1">{t("stats.years")}</div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={2}>
            <div>
              <div className="text-gold text-xs uppercase tracking-[0.3em] mb-3">{t("welcome.kicker")}</div>
              <h2 className="font-display text-4xl md:text-5xl text-charcoal mb-4 leading-tight">{t("welcome.title")}</h2>
              <GoldDivider />
              <p className="text-charcoal/70 leading-loose mt-6 text-lg">{t("welcome.body")}</p>
              <div className="grid grid-cols-2 gap-6 mt-10">
                <div><div className="font-display text-4xl text-gold"><CountUp to={120} suffix="+" /></div><div className="text-xs uppercase tracking-widest text-charcoal/60 mt-1">{t("stats.rooms")}</div></div>
                <div><div className="font-display text-4xl text-gold"><CountUp to={15} /></div><div className="text-xs uppercase tracking-widest text-charcoal/60 mt-1">{t("stats.years")}</div></div>
                <div><div className="font-display text-4xl text-gold"><CountUp to={4.9} decimals={1} /></div><div className="text-xs uppercase tracking-widest text-charcoal/60 mt-1">{t("stats.rating")}</div></div>
                <div><div className="font-display text-4xl text-gold"><CountUp to={3} /></div><div className="text-xs uppercase tracking-widest text-charcoal/60 mt-1">{t("stats.location")}</div></div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FEATURED ROOMS */}
      <section className="py-24 px-5 bg-cream-deep/40">
        <div className="max-w-[1300px] mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <div className="text-gold text-xs uppercase tracking-[0.3em] mb-3">{t("rooms.featured.kicker")}</div>
              <h2 className="font-display text-4xl md:text-5xl text-charcoal">{t("rooms.featured.title")}</h2>
              <GoldDivider />
            </div>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-8">
            {featured.map((r, i) => (
              <Reveal key={r.id} delay={(i + 1) as 1 | 2 | 3}>
                <RoomCard room={r} />
              </Reveal>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/rooms" className="btn-outline-gold">{t("rooms.viewAll")} {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}</Link>
          </div>
        </div>
      </section>

      {/* AMENITIES */}
      <section className="py-24 px-5">
        <div className="max-w-[1200px] mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <div className="text-gold text-xs uppercase tracking-[0.3em] mb-3">{t("amenities.kicker")}</div>
              <h2 className="font-display text-4xl md:text-5xl text-charcoal">{t("amenities.title")}</h2>
              <GoldDivider />
            </div>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {([
              ["wifi","amenities.wifi"], ["parking","amenities.parking"], ["restaurant","amenities.restaurant"], ["pool","amenities.pool"],
              ["gym","amenities.gym"], ["concierge","amenities.concierge"], ["room-service","amenities.roomService"], ["spa","amenities.spa"],
            ] as Array<[string,string]>).map(([icon, key], i) => (
              <Reveal key={icon} delay={((i % 4) + 1) as 1|2|3|4}>
                <div className="text-center p-8 bg-white border border-cream-deep hover:border-gold transition group cursor-default">
                  <AmenityIcon name={icon} className="w-10 h-10 text-gold mx-auto mb-4 group-hover:scale-110 transition" />
                  <div className="text-sm uppercase tracking-widest text-charcoal/80">{t(key)}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <Gallery />

      {/* TESTIMONIALS */}
      <Testimonials />

      {/* CTA BANNER */}
      <section className="relative py-24 px-5 overflow-hidden bg-charcoal">
        <div className="absolute inset-0" style={{ backgroundImage: `url(${pickImage(7)})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.4 }} />
        <div className="absolute inset-0 bg-charcoal/60" />
        <div className="relative max-w-3xl mx-auto text-center text-cream">
          <Reveal>
            <h2 className="font-display text-4xl md:text-5xl mb-4">{t("cta.banner.title")}</h2>
            <p className="text-cream/80 text-lg mb-8">{t("cta.banner.sub")}</p>
            <Link href="/booking" className="btn-gold">{t("hero.cta.book")}</Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}

function Gallery() {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="py-24 px-5 bg-cream">
      <div className="max-w-[1300px] mx-auto">
        <Reveal>
          <div className="text-center mb-12">
            <div className="text-gold text-xs uppercase tracking-[0.3em] mb-3">{t("gallery.kicker")}</div>
            <h2 className="font-display text-4xl md:text-5xl text-charcoal">{t("gallery.title")}</h2>
            <GoldDivider />
          </div>
        </Reveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {hotelImages.map((src, i) => (
            <button key={src} onClick={() => setOpen(i)} className={`group relative overflow-hidden ${i === 0 || i === 5 ? "row-span-2 col-span-2 md:col-span-2 md:row-span-2" : ""}`}>
              <img src={src} alt="" loading="lazy" className="w-full h-full min-h-[180px] object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/30 transition" />
            </button>
          ))}
        </div>
        {open !== null && (
          <div className="fixed inset-0 z-[80] bg-charcoal/95 flex items-center justify-center p-4" onClick={() => setOpen(null)}>
            <button className="absolute top-6 right-6 text-cream" onClick={() => setOpen(null)}><X className="w-8 h-8" /></button>
            <button className="absolute top-1/2 left-6 text-cream p-3" onClick={(e) => { e.stopPropagation(); setOpen((v) => (v === null ? 0 : (v - 1 + hotelImages.length) % hotelImages.length)); }}><ChevronLeft className="w-8 h-8" /></button>
            <img src={hotelImages[open]} alt="" className="max-h-[85vh] max-w-[90vw] object-contain" />
            <button className="absolute top-1/2 right-6 text-cream p-3" onClick={(e) => { e.stopPropagation(); setOpen((v) => (v === null ? 0 : (v + 1) % hotelImages.length)); }}><ChevronRight className="w-8 h-8" /></button>
          </div>
        )}
      </div>
    </section>
  );
}

const TESTIMONIALS = [
  { name: { en: "Khalid Al-Otaibi", ar: "خالد العتيبي" }, country: "🇸🇦", quote: { en: "An elegant stay that felt like home. The majlis suite was breathtaking.", ar: "إقامة راقية شعرت فيها وكأنني في بيتي. مجلس الجناح آسر." }, rating: 5 },
  { name: { en: "Layla Mansour", ar: "ليلى منصور" }, country: "🇦🇪", quote: { en: "Service is intuitive — they anticipate before you ask.", ar: "خدمة استثنائية يستبقون طلباتك قبل أن تنطق بها." }, rating: 5 },
  { name: { en: "James Whitford", ar: "جيمس ويتفورد" }, country: "🇬🇧", quote: { en: "The marble work and gold detailing are simply unmatched in Riyadh.", ar: "أعمال الرخام واللمسات الذهبية لا مثيل لها في الرياض." }, rating: 5 },
  { name: { en: "Noura Al-Sabah", ar: "نورة الصباح" }, country: "🇰🇼", quote: { en: "Quiet, dignified, and absolutely beautiful at every hour of the day.", ar: "هدوء ووقار وجمال مطلق في كل ساعة من اليوم." }, rating: 5 },
  { name: { en: "Faisal Al-Thani", ar: "فيصل آل ثاني" }, country: "🇶🇦", quote: { en: "I now stay nowhere else when I visit Riyadh.", ar: "لم أعد أنزل في غيره حين أزور الرياض." }, rating: 5 },
];

function Testimonials() {
  const { t, language } = useI18n();
  const items = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <section className="py-24 px-5 bg-charcoal text-cream overflow-hidden">
      <div className="max-w-[1200px] mx-auto">
        <Reveal>
          <div className="text-center mb-12">
            <div className="text-gold text-xs uppercase tracking-[0.3em] mb-3">{t("testimonials.kicker")}</div>
            <h2 className="font-display text-4xl md:text-5xl text-cream">{t("testimonials.title")}</h2>
            <GoldDivider />
          </div>
        </Reveal>
      </div>
      <div className="relative max-w-[1400px] mx-auto overflow-hidden">
        <div className="marquee" style={{ width: "200%" }}>
          {items.map((it, i) => (
            <div key={i} className="min-w-[340px] md:min-w-[420px] bg-charcoal-soft/50 border border-cream/10 p-8">
              <div className="flex text-gold mb-3">{Array.from({ length: it.rating }).map((_, j) => <Star key={j} className="w-4 h-4 fill-current" />)}</div>
              <p className="font-display italic text-lg text-cream/90 leading-relaxed mb-5">"{it.quote[language]}"</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gold uppercase tracking-widest text-xs">{it.name[language]}</span>
                <span className="text-2xl">{it.country}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
