import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import {
  Search,
  GitCompareArrows,
  Globe,
  BarChart3,
  FileSearch,
  ArrowRight,
} from "lucide-react";

const tools = [
  {
    title: "Rank Checker",
    description:
      "Check where your website ranks for a specific keyword in Google search results. See top 10 results with SERP features.",
    href: "/rank-checker",
    icon: Search,
    color: "bg-brand-50 text-brand-600",
    border: "border-brand-200",
  },
  {
    title: "Compare URLs",
    description:
      "Compare multiple URLs/domains for a keyword and see which ones rank and where. Identify content gaps.",
    href: "/compare",
    icon: GitCompareArrows,
    color: "bg-emerald-50 text-emerald-600",
    border: "border-emerald-200",
  },
  {
    title: "SERP Explorer",
    description:
      "Discover keyword suggestions with volume, CPC, and difficulty. Analyze full SERP snapshots.",
    href: "/explorer",
    icon: Globe,
    color: "bg-amber-50 text-amber-600",
    border: "border-amber-200",
    badge: "Coming Soon",
  },
  {
    title: "Rank Tracker",
    description:
      "Track keyword rankings daily with trend charts, alerts on position drops, and competitor monitoring.",
    href: "/tracker",
    icon: BarChart3,
    color: "bg-purple-50 text-purple-600",
    border: "border-purple-200",
    badge: "Coming Soon",
  },
  {
    title: "SEO Auditor",
    description:
      "Audit pages for on-page SEO issues: title, meta, headings, internal links, Core Web Vitals, and schema markup.",
    href: "/auditor",
    icon: FileSearch,
    color: "bg-red-50 text-red-600",
    border: "border-red-200",
    badge: "Coming Soon",
  },
];

export default function DashboardPage() {
  return (
    <>
      <TopBar
        title="Dashboard"
        subtitle="SEO Toolkit — All-in-one keyword & ranking intelligence"
      />
      <div className="p-6">
        {/* Hero */}
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-white shadow-lg">
          <h2 className="text-2xl font-bold">Welcome to SEO Toolkit</h2>
          <p className="mt-2 max-w-2xl text-brand-100">
            Your professional suite for keyword research, rank checking,
            competitor analysis, and on-page SEO auditing. Start by checking
            where your website ranks for any keyword.
          </p>
          <Link
            href="/rank-checker"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 shadow-sm hover:bg-brand-50 transition-colors"
          >
            <Search className="h-4 w-4" />
            Check Your Rankings
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Tool Cards */}
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Tools</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <Link
              key={tool.title}
              href={tool.href}
              className={`group relative rounded-xl border ${tool.border} bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5`}
            >
              {tool.badge && (
                <span className="absolute right-4 top-4 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                  {tool.badge}
                </span>
              )}
              <div
                className={`inline-flex rounded-lg p-2.5 ${tool.color}`}
              >
                <tool.icon className="h-5 w-5" />
              </div>
              <h4 className="mt-4 text-base font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">
                {tool.title}
              </h4>
              <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                {tool.description}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">
                Open tool <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
