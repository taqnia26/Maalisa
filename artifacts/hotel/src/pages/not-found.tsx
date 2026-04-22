import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import { GoldDivider } from "@/components/GoldDivider";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <section className="min-h-screen flex items-center justify-center bg-charcoal text-cream px-5">
      <div className="text-center">
        <div className="font-display text-7xl text-gold">404</div>
        <GoldDivider />
        <p className="mt-4 text-cream/70">{t("common.notFound")}</p>
        <Link href="/" className="btn-gold mt-8 inline-flex">{t("common.backHome")}</Link>
      </div>
    </section>
  );
}
