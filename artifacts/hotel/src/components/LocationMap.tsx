import { MapPin, Navigation } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const QUERY = "Al Malqa District, Riyadh, Saudi Arabia";
const EMBED_SRC = `https://www.google.com/maps?q=${encodeURIComponent(QUERY)}&hl=ar&z=14&output=embed`;
const LINK_HREF = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(QUERY)}`;
const DIR_HREF = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(QUERY)}`;

export default function LocationMap() {
  const { t } = useI18n();
  return (
    <section className="bg-cream py-20" data-testid="section-location">
      <div className="max-w-[1400px] mx-auto px-5 md:px-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-gold uppercase tracking-[0.3em] text-xs mb-3">
            <MapPin className="w-4 h-4" />
            <span>{t("location.title")}</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl text-charcoal mb-3">
            {t("footer.address")}
          </h2>
          <p className="text-charcoal/70 max-w-2xl mx-auto">
            {t("location.subtitle")}
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden border border-gold/30 shadow-2xl bg-white">
          <iframe
            title="Nuzul Al-Ma'ali — Google Maps"
            src={EMBED_SRC}
            width="100%"
            height="450"
            style={{ border: 0, display: "block" }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            data-testid="iframe-google-map"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <a
            href={LINK_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-charcoal text-cream hover:bg-charcoal/90 transition text-sm font-medium"
            data-testid="link-open-maps"
          >
            <MapPin className="w-4 h-4" />
            {t("location.openMaps")}
          </a>
          <a
            href={DIR_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border-2 border-gold text-gold hover:bg-gold hover:text-charcoal transition text-sm font-medium"
            data-testid="link-get-directions"
          >
            <Navigation className="w-4 h-4" />
            {t("location.directions")}
          </a>
        </div>
      </div>
    </section>
  );
}
