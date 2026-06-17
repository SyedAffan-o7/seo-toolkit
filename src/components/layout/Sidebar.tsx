"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Search,
  BarChart3,
  FileSearch,
  Settings,
  LayoutDashboard,
  GitCompareArrows,
  Target,
  ChevronDown,
  Zap,
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
    children: [
      {
        name: "Quick Check",
        href: "/rank-checker",
        icon: Search,
      },
      {
        name: "Profile Rankings",
        href: "/rank-checker/pages",
        icon: Target,
      },
    ],
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

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  children?: NavItem[];
}

function NavItemComponent({ item, pathname }: { item: NavItem; pathname: string }) {
  const [isExpanded, setIsExpanded] = useState<boolean>(
    pathname.startsWith(item.href) && !!item.children
  );
  const hasChildren = item.children && item.children.length > 0;

  const isActive = pathname === item.href ||
    (item.href !== "/" && pathname.startsWith(item.href));

  const isChildActive = hasChildren && item.children?.some(
    child => pathname === child.href || pathname.startsWith(child.href)
  );

  if (hasChildren) {
    return (
      <div className="space-y-0.5">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "w-full group flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
            isActive || isChildActive
              ? "bg-white/10 text-white"
              : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
          )}
        >
          <div className="flex items-center gap-3">
            <item.icon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                isActive || isChildActive
                  ? "text-brand-400"
                  : "text-slate-500 group-hover:text-slate-300"
              )}
            />
            {item.name}
          </div>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
              isExpanded ? "rotate-180" : "",
              isActive || isChildActive
                ? "text-brand-400"
                : "text-slate-500"
            )}
          />
        </button>
        {isExpanded && (
          <div className="ml-2 pl-3 border-l border-slate-700/60 space-y-0.5">
            {item.children?.map((child) => {
              const isChildActive = pathname === child.href || pathname.startsWith(child.href);
              return (
                <Link
                  key={child.name}
                  href={child.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200",
                    isChildActive
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  )}
                >
                  <child.icon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-colors",
                      isChildActive
                        ? "text-brand-400"
                        : "text-slate-500 group-hover:text-slate-300"
                    )}
                  />
                  {child.name}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-white/10 text-white"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
      )}
    >
      <item.icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          isActive
            ? "text-brand-400"
            : "text-slate-500 group-hover:text-slate-300"
        )}
      />
      {item.name}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-gradient-to-b from-slate-900 to-slate-950">
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-900/30">
            <Zap className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white tracking-tight leading-tight">
              SEO Toolkit
            </span>
            <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">Rank Intelligence</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 pt-2">
        {navigation.map((item) => (
          <NavItemComponent key={item.name} item={item as NavItem} pathname={pathname} />
        ))}
      </nav>

      <div className="p-4">
        <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-3">
          <p className="text-xs font-medium text-slate-300">Pro Tip</p>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Use Profile Rankings to track multiple pages automatically.
          </p>
        </div>
      </div>
    </aside>
  );
}
