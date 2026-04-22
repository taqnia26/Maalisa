import { Link, useRoute } from "wouter";
import { useState } from "react";
import { useGetRoom, useListRooms } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { Reveal } from "@/components/Reveal";
import { GoldDivider } from "@/components/GoldDivider";
import { RoomCard } from "@/components/RoomCard";
import { AmenityIcon } from "@/components/AmenityIcon";
import { formatSAR } from "@/lib/utils";
import { Users, Bed, Maximize2, ChevronLeft, ChevronRight } from "lucide-react";

export default function RoomDetail() {
  const [, params] = useRoute("/rooms/:id");
  const id = Number(params?.id);
  const { t, language, isRtl } = useI18n();
  const { data: room, isLoading } = useGetRoom(id, { query: { enabled: !Number.isNaN(id) } });
  const { data: allRooms } = useListRooms();
  const [imgIdx, setImgIdx] = useState(0);

  if (isLoading) return <div className="pt-32 text-center text-charcoal/60">{t("common.loading")}</div>;
  if (!room) return <div className="pt-32 text-center text-charcoal/60">{t("common.notFound")}</div>;
  const name = language === "ar" ? room.nameAr : room.name;
  const desc = language === "ar" ? room.descriptionAr : room.description;
  const similar = (allRooms ?? []).filter((r) => r.type === room.type && r.id !== room.id).slice(0, 3);

  return (
    <>
      <section className="pt-24 pb-12 px-5 bg-cream">
        <div className="max-w-[1300px] mx-auto grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="relative h-[480px] bg-charcoal overflow-hidden">
              <img src={room.images[imgIdx]} alt={name} className="absolute inset-0 w-full h-full object-cover" />
              <button onClick={() => setImgIdx((i) => (i - 1 + room.images.length) % room.images.length)} className="absolute top-1/2 -translate-y-1/2 ltr:left-4 rtl:right-4 bg-charcoal/60 text-cream p-2 hover:bg-gold hover:text-charcoal transition">
                {isRtl ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>
              <button onClick={() => setImgIdx((i) => (i + 1) % room.images.length)} className="absolute top-1/2 -translate-y-1/2 ltr:right-4 rtl:left-4 bg-charcoal/60 text-cream p-2 hover:bg-gold hover:text-charcoal transition">
                {isRtl ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3 mt-3">
              {room.images.map((src, i) => (
                <button key={src} onClick={() => setImgIdx(i)} className={`h-24 overflow-hidden ${i === imgIdx ? "ring-2 ring-gold" : "opacity-70 hover:opacity-100"} transition`}>
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <div className="mt-10">
              <div className="text-gold text-xs uppercase tracking-[0.3em] mb-3">{t(`type.${room.type}`)}</div>
              <h1 className="font-display text-4xl md:text-5xl text-charcoal">{name}</h1>
              <GoldDivider />
              <p className="text-charcoal/75 leading-loose mt-6 text-lg">{desc}</p>
              <div className="flex flex-wrap gap-6 mt-8 text-sm text-charcoal/80 border-y border-cream-deep py-5">
                <span className="flex items-center gap-2"><Users className="w-4 h-4 text-gold" />{room.capacity} {t("rooms.guests")}</span>
                <span className="flex items-center gap-2"><Maximize2 className="w-4 h-4 text-gold" />{room.sizeSqm} {t("rooms.sqm")}</span>
                <span className="flex items-center gap-2"><Bed className="w-4 h-4 text-gold" />{room.bedType}</span>
              </div>
              <h3 className="font-display text-2xl text-charcoal mt-8 mb-4">{t("rooms.amenities")}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {room.amenities.map((a) => (
                  <div key={a} className="flex items-center gap-2 text-sm text-charcoal/80 bg-white px-3 py-2 border border-cream-deep">
                    <AmenityIcon name={a} className="w-4 h-4 text-gold" /> {a}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <aside className="lg:sticky lg:top-28 self-start bg-white border border-cream-deep p-7 shadow-sm">
            <div className="text-xs uppercase tracking-widest text-charcoal/60">{t("rooms.from")}</div>
            <div className="font-display text-4xl text-gold mt-1">{formatSAR(room.price)} <span className="text-sm text-charcoal/70">{t("common.sar")}/{t("rooms.perNight")}</span></div>
            <GoldDivider />
            <Link href={`/booking?roomId=${room.id}`} className="btn-gold w-full mt-6">{t("rooms.bookNow")}</Link>
            <Link href="/rooms" className="btn-outline-gold w-full mt-3">{t("rooms.viewAll")}</Link>
          </aside>
        </div>
      </section>
      {similar.length > 0 && (
        <section className="py-20 px-5 bg-cream-deep/30">
          <div className="max-w-[1300px] mx-auto">
            <Reveal>
              <h2 className="font-display text-3xl md:text-4xl text-charcoal text-center">{t("rooms.similar")}</h2>
              <GoldDivider />
            </Reveal>
            <div className="grid md:grid-cols-3 gap-8 mt-10">
              {similar.map((r, i) => (
                <Reveal key={r.id} delay={((i % 3) + 1) as 1 | 2 | 3}><RoomCard room={r} /></Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
