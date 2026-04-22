import { Link } from "wouter";
import { useListRooms } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { pickImage } from "@/lib/images";
import { Reveal } from "@/components/Reveal";
import { GoldDivider } from "@/components/GoldDivider";
import { AmenityIcon } from "@/components/AmenityIcon";
import { formatSAR } from "@/lib/utils";
import { Users, Bed, Maximize2 } from "lucide-react";

export default function SuitesPage() {
  const { t, language } = useI18n();
  const { data: rooms } = useListRooms({ type: "suite" });
  const suites = rooms ?? [];

  return (
    <>
      <section className="page-banner pt-20" style={{ backgroundImage: `url(${pickImage(5)})` }}>
        <div className="text-center text-cream">
          <div className="text-gold text-xs uppercase tracking-[0.3em] mb-3">{t("rooms.filterSuites")}</div>
          <h1 className="font-display text-5xl md:text-6xl">{t("nav.suites")}</h1>
          <GoldDivider />
        </div>
      </section>
      <div className="bg-cream">
        {suites.map((s, i) => (
          <Reveal key={s.id}>
            <section className={`py-20 px-5 ${i % 2 === 1 ? "bg-cream-deep/30" : ""}`}>
              <div className={`max-w-[1300px] mx-auto grid md:grid-cols-2 gap-10 items-center ${i % 2 === 1 ? "md:[direction:rtl]" : ""}`}>
                <div className="grid grid-cols-2 gap-3 [direction:ltr]">
                  <img src={s.images[0]} alt="" className="col-span-2 h-80 w-full object-cover" />
                  <img src={s.images[1] ?? s.images[0]} alt="" className="h-44 w-full object-cover" />
                  <img src={s.images[2] ?? s.images[0]} alt="" className="h-44 w-full object-cover" />
                </div>
                <div className="[direction:initial]">
                  <div className="text-gold text-xs uppercase tracking-[0.3em] mb-3">{t(`type.${s.type}`)}</div>
                  <h2 className="font-display text-4xl md:text-5xl text-charcoal mb-4">{language === "ar" ? s.nameAr : s.name}</h2>
                  <GoldDivider />
                  <p className="text-charcoal/70 mt-6 leading-loose text-lg">{language === "ar" ? s.descriptionAr : s.description}</p>
                  <div className="flex flex-wrap gap-5 mt-6 text-sm text-charcoal/70">
                    <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-gold" />{s.capacity} {t("rooms.guests")}</span>
                    <span className="flex items-center gap-1.5"><Maximize2 className="w-4 h-4 text-gold" />{s.sizeSqm} {t("rooms.sqm")}</span>
                    <span className="flex items-center gap-1.5"><Bed className="w-4 h-4 text-gold" />{s.bedType}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-5">
                    {s.amenities.map((a) => (
                      <span key={a} className="flex items-center gap-1.5 text-xs text-charcoal/70 bg-white px-3 py-1.5 border border-cream-deep">
                        <AmenityIcon name={a} className="w-3.5 h-3.5 text-gold" /> {a}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-6 mt-8">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-charcoal/60">{t("rooms.from")}</div>
                      <div className="font-display text-3xl text-gold">{formatSAR(s.price)} <span className="text-sm text-charcoal/70">{t("common.sar")}/{t("rooms.perNight")}</span></div>
                    </div>
                    <Link href={`/booking?roomId=${s.id}`} className="btn-gold">{t("rooms.bookSuite")}</Link>
                  </div>
                </div>
              </div>
            </section>
          </Reveal>
        ))}
      </div>
    </>
  );
}
