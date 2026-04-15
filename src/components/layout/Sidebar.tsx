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
  FileText,
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
        name: "Page Rankings",
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
      <div className="space-y-1">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "w-full group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isActive || isChildActive
              ? "bg-brand-50 text-brand-700"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          )}
        >
          <div className="flex items-center gap-3">
            <item.icon
              className={cn(
                "h-5 w-5 shrink-0",
                isActive || isChildActive
                  ? "text-brand-600"
                  : "text-gray-400 group-hover:text-gray-600"
              )}
            />
            {item.name}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 transition-transform",
              isExpanded ? "rotate-180" : "",
              isActive || isChildActive
                ? "text-brand-600"
                : "text-gray-400"
            )}
          />
        </button>
        {isExpanded && (
          <div className="ml-4 pl-4 border-l border-gray-200 space-y-1">
            {item.children?.map((child) => {
              const isChildActive = pathname === child.href || pathname.startsWith(child.href);
              return (
                <Link
                  key={child.name}
                  href={child.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isChildActive
                      ? "bg-brand-50 text-brand-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <child.icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isChildActive
                        ? "text-brand-600"
                        : "text-gray-400 group-hover:text-gray-600"
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
}

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
        {navigation.map((item) => (
          <NavItemComponent key={item.name} item={item as NavItem} pathname={pathname} />
        ))}
      </nav>
    </aside>
  );
}
