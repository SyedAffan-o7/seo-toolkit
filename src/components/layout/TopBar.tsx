"use client";

import { Bell, HelpCircle } from "lucide-react";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export default function TopBar({ title, subtitle }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/70 px-6 backdrop-blur-xl">
      <div>
        <h1 className="text-base font-semibold text-slate-900">{title}</h1>
        {subtitle && (
          <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
          <HelpCircle className="h-4 w-4" />
        </button>
        <button className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-white" />
        </button>
        <div className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-50 text-xs font-semibold text-brand-700 border border-brand-200/50">
          U
        </div>
      </div>
    </header>
  );
}
