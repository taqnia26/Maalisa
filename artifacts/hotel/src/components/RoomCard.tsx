import { Link } from "wouter";
import { useRef } from "react";
import { Users, Bed, Maximize2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { formatSAR } from "@/lib/utils";
import { AmenityIcon } from "./AmenityIcon";

export interface RoomLike {
  id: number;
  name: string;
  nameAr: string;
  type: string;
  description: string;
  descriptionAr: string;
  price: number;
  capacity: number;
  sizeSqm: number;
  bedType: string;
  amenities: string[];
  images: string[];
  discountPrice?: number | null;
  discountLabel?: string | null;
  discountLabelAr?: string | null;
}

export function RoomCard({ room }: { room: RoomLike }) {
  const { t, language } = useI18n();
  const ref = useRef<HTMLDivElement | null>(null);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1100px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg)`;
  }
  function reset() {
    const el = ref.current;
    if (el) el.style.transform = "perspective(1100px) rotateX(0) rotateY(0)";
  }

  const name = language === "ar" ? room.nameAr : room.name;
  const desc = language === "ar" ? room.descriptionAr : room.description;
  const img = room.images[0] ?? "";

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className="tilt-card bg-white shadow-sm hover:shadow-xl transition-shadow duration-500 overflow-hidden"
    >
      <div className="img-fx img-fx-shine relative h-64 bg-charcoal">
        <img src={img} alt={name} className="tilt-img absolute inset-0 w-full h-full object-cover" loading="lazy" />
        <div className="absolute top-3 ltr:left-3 rtl:right-3 flex items-center gap-2">
          <span className="badge bg-charcoal/80 text-gold border-gold">{t(`type.${room.type}`)}</span>
          {room.discountPrice != null && room.discountPrice < room.price && (
            <span className="badge bg-gold text-charcoal border-gold font-bold uppercase tracking-widest">
              {(language === "ar" ? room.discountLabelAr : room.discountLabel) || t("rooms.offer")}
            </span>
          )}
        </div>
        <div className="absolute bottom-3 ltr:right-3 rtl:left-3 bg-charcoal/85 text-gold px-3 py-1.5 text-sm">
          {room.discountPrice != null && room.discountPrice < room.price ? (
            <>
              <span className="text-xs opacity-70 line-through me-1">{formatSAR(room.price)}</span>
              <span className="font-display text-xl">{formatSAR(room.discountPrice)}</span>
            </>
          ) : (
            <span className="font-display text-xl">{formatSAR(room.price)}</span>
          )}{" "}
          <span className="text-xs opacity-80">{t("common.sar")}/{t("rooms.perNight")}</span>
        </div>
      </div>
      <div className="p-5 space-y-3">
        <h3 className="font-display text-2xl text-charcoal">{name}</h3>
        <p className="text-sm text-charcoal/70 line-clamp-2 leading-relaxed">{desc}</p>
        <div className="flex items-center gap-4 text-xs text-charcoal/70">
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-gold" />{room.capacity} {t("rooms.guests")}</span>
          <span className="flex items-center gap-1"><Maximize2 className="w-3.5 h-3.5 text-gold" />{room.sizeSqm} {t("rooms.sqm")}</span>
          <span className="flex items-center gap-1"><Bed className="w-3.5 h-3.5 text-gold" />{room.bedType}</span>
        </div>
        <div className="flex items-center gap-2 text-bronze/90">
          {room.amenities.slice(0, 5).map((a) => <AmenityIcon key={a} name={a} className="w-4 h-4" />)}
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-cream-deep">
          <Link href={`/rooms/${room.id}`} className="btn-outline-gold !py-2 !px-4 !text-xs flex-1 text-center">{t("rooms.details")}</Link>
          <Link href={`/booking?roomId=${room.id}`} className="btn-gold !py-2 !px-4 !text-xs flex-1 text-center">{t("rooms.bookNow")}</Link>
        </div>
      </div>
    </div>
  );
}
