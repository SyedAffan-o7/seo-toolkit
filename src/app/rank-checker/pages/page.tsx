"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, FormEvent, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import PageKeywordManager from "@/components/page-keywords/PageKeywordManager";
import PageKeywordDashboard from "@/components/page-keywords/PageKeywordDashboard";
import { LayoutDashboard, List, Plus, Loader2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

// Simple Tabs component if not available
function SimpleTabsList({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex gap-1 p-1 bg-gray-100 rounded-lg ${className}`}>{children}</div>;
}

function SimpleTabsTrigger({ 
  children, 
  active, 
  onClick 
}: { 
  children: React.ReactNode; 
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        active 
          ? "bg-white text-gray-900 shadow-sm" 
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

interface Project {
  id: string;
  name: string;
  domain: string;
}

function PageRankingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlProjectId = searchParams.get("projectId");
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(urlProjectId || "");
  const [activeTab, setActiveTab] = useState<"dashboard" | "manage">("manage");
  const [isLoading, setIsLoading] = useState(true);
  
  // Profile creation state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      
      const projectsList = data.projects || [];
      setProjects(projectsList);
      
      // If URL has projectId and it exists in the list, use it
      // Otherwise select first project if none selected
      if (urlProjectId && projectsList.find((p: Project) => p.id === urlProjectId)) {
        setSelectedProjectId(urlProjectId);
      } else if (projectsList.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projectsList[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId, urlProjectId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsCreatingProject(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create project");
      }

      const data = await res.json();
      toast.success("Project created successfully");
      
      // Reset form
      setNewProjectName("");
      setShowCreateForm(false);
      
      // Refresh projects, update URL and select the new one
      await fetchProjects();
      if (data.project?.id) {
        setSelectedProjectId(data.project.id);
        router.replace(`/rank-checker/pages?projectId=${data.project.id}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create project");
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProjectId) return;
    
    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return;

    if (!confirm(`Are you sure you want to delete "${project.name}"? This will delete all keywords, rankings, and page mappings. This cannot be undone.`)) {
      return;
    }

    setIsDeletingProject(true);
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete profile");

      toast.success(`Profile "${project.name}" deleted successfully`);
      setSelectedProjectId("");
      router.replace("/rank-checker/pages");
      fetchProjects();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete profile");
    } finally {
      setIsDeletingProject(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <TopBar title="Page Rankings" subtitle="Track keyword positions for specific pages" />
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Page Rankings" subtitle="Track where specific pages rank for their target keywords" />
      
      <div className="p-6 space-y-6">
        {/* Profile Selector */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Profile:</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white py-2 px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="">Select a profile...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} ({project.domain})
                </option>
              ))}
            </select>
            {selectedProjectId && (
              <button
                onClick={handleDeleteProject}
                disabled={isDeletingProject}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete profile"
              >
                {isDeletingProject ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            )}
            {projects.length === 0 && (
              <span className="text-sm text-amber-600">
                No profiles available. Create one first.
              </span>
            )}
          </div>

          {/* Tabs */}
          <SimpleTabsList>
            <SimpleTabsTrigger 
              active={activeTab === "dashboard"}
              onClick={() => setActiveTab("dashboard")}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </SimpleTabsTrigger>
            <SimpleTabsTrigger 
              active={activeTab === "manage"}
              onClick={() => setActiveTab("manage")}
            >
              <List className="h-4 w-4" />
              Manage Mappings
            </SimpleTabsTrigger>
          </SimpleTabsList>
        </div>

        {/* Content */}
        {selectedProjectId ? (
          <div className="animate-in fade-in duration-200">
            {activeTab === "dashboard" ? (
              <PageKeywordDashboard projectId={selectedProjectId} />
            ) : (
              <PageKeywordManager projectId={selectedProjectId} />
            )}
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-12">
            <div className="mx-auto max-w-md">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
                  <Plus className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  No Profiles Found
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Create a profile first to start tracking page rankings.
                </p>
              </div>
              
              {!showCreateForm ? (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create New Profile
                </button>
              ) : (
                <form onSubmit={handleCreateProject} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Profile Name
                    </label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="e.g. My Website"
                      className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      required
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingProject}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                    >
                      {isCreatingProject ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Create
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-12">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
                <Plus className="h-6 w-6 text-brand-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Select a Project
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Choose a project from the dropdown above to start tracking page rankings.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function PageRankingsPage() {
  return (
    <Suspense fallback={
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    }>
      <PageRankingsContent />
    </Suspense>
  );
}
