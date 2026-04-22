import {
  Wifi, Car, UtensilsCrossed, Waves, Dumbbell, ConciergeBell, BellRing, Sparkles,
  Tv, Snowflake, Briefcase, Bath, Coffee, Lock, Sofa, Home,
} from "lucide-react";
import type { ComponentType } from "react";

const map: Record<string, ComponentType<{ className?: string }>> = {
  wifi: Wifi,
  parking: Car,
  restaurant: UtensilsCrossed,
  pool: Waves,
  gym: Dumbbell,
  concierge: ConciergeBell,
  "room-service": BellRing,
  spa: Sparkles,
  tv: Tv,
  ac: Snowflake,
  workspace: Briefcase,
  bathtub: Bath,
  minibar: Coffee,
  safe: Lock,
  "living-room": Sofa,
  majlis: Sofa,
  kitchenette: Coffee,
  study: Briefcase,
  balcony: Home,
};

export function AmenityIcon({ name, className = "w-5 h-5" }: { name: string; className?: string }) {
  const Icon = map[name] ?? Sparkles;
  return <Icon className={className} />;
}
