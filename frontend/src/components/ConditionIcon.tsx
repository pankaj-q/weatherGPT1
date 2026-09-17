"use client";

import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { conditionFor, type ConditionKind } from "@/lib/conditions";

const MAP: Record<ConditionKind, LucideIcon> = {
  clear: Sun,
  partly: CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  storm: CloudLightning,
  snow: CloudSnow,
};

export default function ConditionIcon({
  code,
  isDay = true,
  className = "h-6 w-6",
}: {
  code: number;
  isDay?: boolean;
  className?: string;
}) {
  const kind = conditionFor(code).kind;
  if (kind === "clear") {
    const Icon = isDay ? Sun : Moon;
    return <Icon className={className} strokeWidth={1.6} />;
  }
  if (kind === "partly") {
    const Icon = isDay ? CloudSun : CloudMoon;
    return <Icon className={className} strokeWidth={1.6} />;
  }
  const Icon = MAP[kind];
  return <Icon className={className} strokeWidth={1.6} />;
}