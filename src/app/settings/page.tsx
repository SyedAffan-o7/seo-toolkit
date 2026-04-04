import TopBar from "@/components/layout/TopBar";
import { Settings, SlidersHorizontal, Database, KeyRound } from "lucide-react";

export default function SettingsPage() {
  return (
    <>
      <TopBar
        title="Settings"
        subtitle="Project, provider, and integration preferences"
      />

      <div className="p-6 space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-700" />
            <h2 className="text-base font-semibold text-gray-900">Workspace Settings</h2>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            This page is ready and linked. Detailed configuration panels will be
            added next.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <SlidersHorizontal className="h-4 w-4 text-brand-600" />
              App Preferences
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Theme, defaults, and localization.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Database className="h-4 w-4 text-emerald-600" />
              Data & Storage
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Project retention and sync options.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <KeyRound className="h-4 w-4 text-amber-600" />
              API Integrations
            </div>
            <p className="mt-2 text-sm text-gray-600">
              SERP provider keys and service connections.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
