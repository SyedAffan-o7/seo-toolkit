"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  BarChart3,
  FileSearch,
  Settings,
  LayoutDashboard,
  GitCompareArrows,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Rank Checker",
    href: "/rank-checker",
    icon: Search,
  },
  {
    name: "Compare URLs",
    href: "/compare",
    icon: GitCompareArrows,
  },
  {
    name: "Rank Tracker",
    href: "/tracker",
    icon: BarChart3,
  },
  {
    name: "SEO Auditor",
    href: "/auditor",
    icon: FileSearch,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold text-sm">
          SE
        </div>
        <span className="text-lg font-bold text-gray-900">SEO Toolkit</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  isActive
                    ? "text-brand-600"
                    : "text-gray-400 group-hover:text-gray-600"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
