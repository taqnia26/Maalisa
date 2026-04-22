import { useState } from "react";
import { useListRooms } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { pickImage } from "@/lib/images";
import { RoomCard } from "@/components/RoomCard";
import { Reveal } from "@/components/Reveal";
import { GoldDivider } from "@/components/GoldDivider";

type Filter = "all" | "rooms" | "suites";

export default function RoomsPage() {
  const { t } = useI18n();
  const { data: rooms, isLoading } = useListRooms();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = (rooms ?? []).filter((r) => {
    if (filter === "all") return true;
    if (filter === "suites") return r.type === "suite";
    return r.type !== "suite";
  });

  return (
    <>
      <section className="page-banner pt-20" style={{ backgroundImage: `url(${pickImage(2)})` }}>
        <div className="text-center text-cream">
          <div className="text-gold text-xs uppercase tracking-[0.3em] mb-3">{t("rooms.featured.kicker")}</div>
          <h1 className="font-display text-5xl md:text-6xl">{t("nav.rooms")}</h1>
          <GoldDivider />
        </div>
      </section>
      <section className="py-16 px-5">
        <div className="max-w-[1300px] mx-auto">
          <div className="flex items-center justify-center gap-3 mb-12">
            {(["all", "rooms", "suites"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 py-2 text-sm uppercase tracking-widest font-bold transition border ${
                  filter === f ? "bg-gold text-charcoal border-gold" : "bg-transparent text-charcoal border-charcoal/20 hover:border-gold hover:text-gold"
                }`}
              >
                {t(f === "all" ? "rooms.filterAll" : f === "rooms" ? "rooms.filterRooms" : "rooms.filterSuites")}
              </button>
            ))}
          </div>
          {isLoading ? (
            <div className="text-center text-charcoal/60">{t("common.loading")}</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map((r, i) => (
                <Reveal key={r.id} delay={((i % 3) + 1) as 1 | 2 | 3}>
                  <RoomCard room={r} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
