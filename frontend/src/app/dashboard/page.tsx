"use client";

import { motion } from "framer-motion";
import { FolderGit2, Plus, ArrowRight, Activity, Search, LogOut, GitBranch, ChevronLeft } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Repo {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  updated_at: string;
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [repoUrl, setRepoUrl] = useState("");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGithub, setLoadingGithub] = useState(false);

  const fetchRepos = async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch(`http://localhost:8000/api/v1/repos/user/${session.user.id}`);
      if (res.ok) {
        const data = await res.json();
        setRepos(data);
      }
    } catch (error) {
      console.error("Failed to fetch repos", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGithubRepos = async () => {
    // @ts-ignore
    if (!session?.user?.accessToken) return;
    setLoadingGithub(true);
    try {
      // @ts-ignore
      const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
        headers: {
          // @ts-ignore
          Authorization: `Bearer ${session.user.accessToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setGithubRepos(data);
      }
    } catch (error) {
      console.error("Failed to fetch GitHub repos", error);
    } finally {
      setLoadingGithub(false);
    }
  };

  useEffect(() => {
    fetchRepos();
    fetchGithubRepos();
  }, [session]);

  const handleImport = async (url: string) => {
    if (!session?.user?.id) return alert("Please sign in first");
    if (!url) return;
    
    try {
      const res = await fetch("http://localhost:8000/api/v1/repos/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          github_url: url,
          user_id: session.user.id,
          // @ts-ignore
          access_token: session.user.accessToken
        })
      });
      if (res.ok) {
        setRepoUrl("");
        fetchRepos(); // refresh list
      }
    } catch (error) {
      console.error("Failed to import repo", error);
    }
  };

  const handleRetry = async (e: React.MouseEvent, repoId: string) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:8000/api/v1/repos/${repoId}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // @ts-ignore
          access_token: session?.user?.accessToken || ""
        })
      });
      if (res.ok) {
        fetchRepos();
      }
    } catch (error) {
      console.error("Failed to retry repo", error);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 mb-4 text-neutral-400 hover:text-white transition-colors w-max text-sm font-medium p-2 hover:bg-white/10 rounded-lg -ml-2">
              <ChevronLeft className="w-5 h-5" />
              Back to Home
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-neutral-400 mt-1">
              Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}. Ready to cure developer amnesia?
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input 
                type="text" 
                placeholder="Search repos..." 
                className="pl-9 pr-4 py-2 bg-neutral-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
            <Link 
              href="/profile"
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Profile"
            >
              {session?.user?.image ? (
                <img src={session.user.image} alt="Profile" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center border border-white/10">
                  <span className="text-xs font-semibold">{session?.user?.name?.[0] || "?"}</span>
                </div>
              )}
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content (Repos) */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-indigo-400" />
              Your Knowledge Graphs
            </h2>
            
            <div className="grid gap-4">
              {loading ? (
                <div className="text-neutral-500 animate-pulse">Loading repositories...</div>
              ) : repos.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 border border-dashed border-white/10 rounded-xl">
                  No repositories imported yet. Select one from the sidebar or paste a URL to get started.
                </div>
              ) : (
                repos.map((repo, i) => (
                  <Link href={`/repo/${repo.id}`} key={repo.id}>
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{repo.name}</h3>
                          {repo.status === "COMPLETED" ? (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Ready</span>
                          ) : repo.status === "FAILED" ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 text-xs rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">Failed</span>
                              <button onClick={(e) => handleRetry(e, repo.id)} className="px-2 py-0.5 text-xs rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500 hover:text-white transition-colors">Retry</button>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                              <Activity className="w-3 h-3 animate-pulse" /> {repo.status}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                          <span>Imported {new Date(repo.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button className="hidden sm:flex p-2 rounded-lg bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center hover:bg-white/10">
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </motion.div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Github Repos Widget */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 relative z-10">
                <GitBranch className="w-5 h-5" />
                Your GitHub Repos
              </h2>
              
              <div className="space-y-3 relative z-10 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {loadingGithub ? (
                  <div className="text-sm text-neutral-500 animate-pulse">Fetching repositories...</div>
                ) : githubRepos.length === 0 ? (
                  <div className="text-sm text-neutral-500">No recent repositories found.</div>
                ) : (
                  githubRepos.map((r) => (
                    <div key={r.id} className="p-3 rounded-lg bg-black/20 border border-white/5 hover:border-white/10 flex items-center justify-between group">
                      <div className="overflow-hidden">
                        <p className="font-medium text-sm truncate" title={r.full_name}>{r.name}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">Updated {new Date(r.updated_at).toLocaleDateString()}</p>
                      </div>
                      <button 
                        onClick={() => handleImport(r.html_url)}
                        className="p-1.5 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        title="Import Repo"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Custom Link Import Widget */}
            <div className="p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 bg-indigo-500/20 blur-3xl rounded-full" />
              <h2 className="text-lg font-semibold mb-2 relative z-10">Import via Link</h2>
              <p className="text-sm text-indigo-200/70 mb-6 relative z-10">
                Paste any public GitHub URL to generate a cheat sheet.
              </p>
              
              <form onSubmit={(e) => { e.preventDefault(); handleImport(repoUrl); }} className="space-y-4 relative z-10">
                <div>
                  <input 
                    type="url" 
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    required
                    placeholder="https://github.com/user/repo" 
                    className="w-full px-4 py-3 bg-neutral-950/50 border border-indigo-500/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-neutral-600"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_-5px_rgba(99,102,241,0.4)]"
                >
                  <Plus className="w-4 h-4" />
                  Ingest Codebase
                </button>
              </form>
            </div>

          </div>

        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}
