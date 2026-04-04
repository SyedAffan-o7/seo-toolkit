"use client";

import { SerpFeature } from "@/types/serp";
import {
  Star,
  HelpCircle,
  MapPin,
  BookOpen,
  Image,
  Video,
  Newspaper,
  ShoppingCart,
  Link2,
  LucideIcon,
} from "lucide-react";

const featureConfig: Record<
  SerpFeature,
  { label: string; icon: LucideIcon; color: string }
> = {
  featured_snippet: {
    label: "Featured Snippet",
    icon: Star,
    color: "bg-yellow-100 text-yellow-700",
  },
  people_also_ask: {
    label: "People Also Ask",
    icon: HelpCircle,
    color: "bg-purple-100 text-purple-700",
  },
  local_pack: {
    label: "Local Pack",
    icon: MapPin,
    color: "bg-red-100 text-red-700",
  },
  knowledge_panel: {
    label: "Knowledge Panel",
    icon: BookOpen,
    color: "bg-blue-100 text-blue-700",
  },
  image_pack: {
    label: "Image Pack",
    icon: Image,
    color: "bg-pink-100 text-pink-700",
  },
  video: {
    label: "Video",
    icon: Video,
    color: "bg-indigo-100 text-indigo-700",
  },
  top_stories: {
    label: "Top Stories",
    icon: Newspaper,
    color: "bg-orange-100 text-orange-700",
  },
  shopping: {
    label: "Shopping",
    icon: ShoppingCart,
    color: "bg-green-100 text-green-700",
  },
  sitelinks: {
    label: "Sitelinks",
    icon: Link2,
    color: "bg-cyan-100 text-cyan-700",
  },
};

interface SerpFeatureBadgeProps {
  feature: SerpFeature;
}

export default function SerpFeatureBadge({ feature }: SerpFeatureBadgeProps) {
  const config = featureConfig[feature];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
