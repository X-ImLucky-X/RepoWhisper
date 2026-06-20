"use client";

import { motion } from "framer-motion";
import { FolderGit2, Plus, ArrowRight, Activity, Search, LogOut, GitBranch, ChevronLeft } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { API_BASE } from "../../config";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [pollDelay, setPollDelay] = useState(3000);

  const fetchRepos = async () => {
    if (!(session?.user as any)?.id) return;
    const userId = (session?.user as any).id;
    try {
      const res = await fetch(`${API_BASE}/api/v1/repos/user/${userId}`, {
        headers: {
          "X-User-Id": userId
        }
      });
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

  // Poll for status updates if any repo is currently parsing (exponential backoff)
  const parsingStatusKey = repos.map(r => `${r.id}:${r.status}`).join(",");
  useEffect(() => {
    const needsPolling = repos.some(r => r.status === "PENDING" || r.status === "PARSING");
    if (!needsPolling) {
      setPollDelay(3000); // Reset delay
      return;
    }
    const timer = setTimeout(async () => {
      await fetchRepos();
      setPollDelay(prev => Math.min(prev * 1.5, 30000));
    }, pollDelay);
    return () => clearTimeout(timer);
  }, [parsingStatusKey, pollDelay]);

  const handleImport = async (url: string) => {
    if (!(session?.user as any)?.id) return alert("Please sign in first");
    if (!url) return;
    const userId = (session?.user as any).id;
    
    try {
      const res = await fetch(`${API_BASE}/api/v1/repos/import`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Id": userId 
        },
        body: JSON.stringify({
          github_url: url,
          user_id: userId,
          // @ts-ignore
          access_token: (session?.user as any)?.accessToken
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
      const userId = (session?.user as any)?.id || "";
      const res = await fetch(`${API_BASE}/api/v1/repos/${repoId}/retry`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Id": userId
        },
        body: JSON.stringify({
          access_token: (session?.user as any)?.accessToken || ""
        })
      });
      if (res.ok) {
        fetchRepos();
      }
    } catch (error) {
      console.error("Failed to retry repo", error);
    }
  };

  const filteredRepos = repos.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-cyber-canvas text-white p-4 sm:p-6 md:p-10 uppercase font-bold relative">
      {/* Retro Dot Background */}
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle,#ffffff_2px,transparent_2px)] bg-[size:32px_32px] animate-slide-diagonal z-0" />
      
      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-cyber-border pb-6">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 mb-4 text-cyber-cyan hover:text-white transition-colors w-max text-sm p-2 hover:bg-cyber-panel border-2 border-transparent hover:border-cyber-border">
              <ChevronLeft className="w-5 h-5" />
              [Back to Home]
            </Link>
            <h1 className="text-4xl tracking-tight drop-shadow-[4px_4px_0px_#BD00FF]">Dashboard</h1>
            <p className="text-white mt-2 normal-case font-mono bg-cyber-panel border-2 border-cyber-border p-2 inline-block">
              Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}. Ready to cure developer amnesia?
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white" />
              <input 
                id="search-repos"
                name="search-repos"
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="SEARCH REPOS..." 
                className="w-full pl-9 pr-4 py-2 bg-cyber-panel border-2 border-cyber-border text-sm focus:outline-none focus:ring-0 focus:border-cyber-cyan transition-all placeholder:text-neutral-500 shadow-[4px_4px_0px_#000] normal-case"
              />
            </div>
            <Link 
              href="/profile"
              className="p-1 border-2 border-cyber-border hover:border-cyber-cyan transition-colors bg-cyber-panel shadow-[4px_4px_0px_#000]"
              title="Profile"
            >
              {session?.user?.image ? (
                <img src={session.user.image} alt="Profile" className="w-8 h-8 object-cover" />
              ) : (
                <div className="w-8 h-8 bg-cyber-canvas flex items-center justify-center">
                  <span className="text-xs font-semibold">{session?.user?.name?.[0] || "?"}</span>
                </div>
              )}
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content (Repos) */}
          <div className="lg:col-span-2 relative min-h-[500px]">
            <div className="lg:absolute lg:inset-0 flex flex-col gap-6 h-full">
              <h2 className="text-2xl flex items-center gap-2 text-cyber-cyan drop-shadow-[2px_2px_0px_#000] shrink-0">
              <FolderGit2 className="w-6 h-6" />
              Your Knowledge Graphs
            </h2>
            
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 pb-4 custom-scrollbar">
              <div className="grid gap-6">
                {loading ? (
                <div className="text-cyber-cyan animate-pulse bg-cyber-panel border-2 border-cyber-border p-4">SYSTEM SCANNING...</div>
              ) : repos.length === 0 ? (
                <div className="p-8 text-center text-white border-4 border-dashed border-cyber-border bg-cyber-panel shadow-[8px_8px_0px_#000]">
                  NO REPOSITORIES IMPORTED YET. SELECT ONE FROM THE SIDEBAR OR PASTE A URL TO INITIATE SEQUENCE.
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="p-8 text-center text-white border-4 border-dashed border-cyber-border bg-cyber-panel shadow-[8px_8px_0px_#000]">
                  NO REPOSITORIES MATCH "{searchQuery}".
                </div>
              ) : (
                filteredRepos.map((repo, i) => (
                  <Link href={`/repo/${repo.id}`} key={repo.id}>
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-5 bg-cyber-panel border-4 border-cyber-border shadow-[8px_8px_0px_#000] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[4px_4px_0px_#000] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group cursor-pointer"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h3 className="text-xl text-cyber-primary">{repo.name}</h3>
                          {repo.status === "COMPLETED" ? (
                            <span className="px-2 py-0.5 text-xs bg-emerald-500 text-black border-2 border-cyber-border shadow-[2px_2px_0px_#000]">READY</span>
                          ) : repo.status === "FAILED" ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 text-xs bg-rose-500 text-black border-2 border-cyber-border shadow-[2px_2px_0px_#000]">FAILED</span>
                              <button onClick={(e) => handleRetry(e, repo.id)} className="px-2 py-0.5 text-xs bg-cyber-cyan text-black border-2 border-cyber-border shadow-[2px_2px_0px_#000] hover:bg-white transition-colors">RETRY</button>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 text-xs bg-amber-500 text-black border-2 border-cyber-border shadow-[2px_2px_0px_#000] flex items-center gap-1">
                              <Activity className="w-3 h-3 animate-pulse" /> {repo.status}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-white font-mono normal-case">
                          <span>Imported {new Date(repo.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button className="hidden sm:flex p-2 bg-cyber-cyan border-2 border-cyber-border text-black shadow-[4px_4px_0px_#000] group-hover:bg-white transition-colors items-center justify-center">
                        <ArrowRight className="w-6 h-6" />
                      </button>
                    </motion.div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
        </div>

          {/* Sidebar */}
          <div className="space-y-8">
            
            {/* Github Repos Widget */}
            <div className="p-6 bg-cyber-panel border-4 border-cyber-border shadow-[8px_8px_0px_#000] relative overflow-hidden">
              <h2 className="text-xl mb-4 flex items-center gap-2 relative z-10 text-white">
                <GitBranch className="w-6 h-6 text-cyber-primary" />
                Your GitHub Repos
              </h2>
              
              <div className="space-y-4 relative z-10 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {loadingGithub ? (
                  <div className="text-sm text-cyber-cyan animate-pulse">FETCHING DIRECTORY...</div>
                ) : githubRepos.length === 0 ? (
                  <div className="text-sm text-white">NO RECENT REPOSITORIES FOUND.</div>
                ) : (
                  githubRepos.map((r) => (
                    <div key={r.id} className="p-3 bg-cyber-canvas border-2 border-cyber-border shadow-[4px_4px_0px_#000] flex items-center justify-between group">
                      <div className="overflow-hidden">
                        <p className="text-sm text-cyber-cyan truncate" title={r.full_name}>{r.name}</p>
                        <p className="text-xs text-white mt-1 font-mono normal-case">Updated {new Date(r.updated_at).toLocaleDateString()}</p>
                      </div>
                      <button 
                        onClick={() => handleImport(r.html_url)}
                        className="p-2 bg-cyber-primary text-black border-2 border-cyber-border hover:bg-white transition-colors shadow-[2px_2px_0px_#000]"
                        title="Import Repo"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Custom Link Import Widget */}
            <div className="p-6 bg-cyber-cyan border-4 border-cyber-border shadow-[8px_8px_0px_#BD00FF] relative overflow-hidden text-black">
              <h2 className="text-xl mb-2 relative z-10">Import via Link</h2>
              <p className="text-sm font-mono normal-case mb-6 relative z-10">
                Paste any public GitHub URL to generate an architectural cheat sheet.
              </p>
              
              <form onSubmit={(e) => { e.preventDefault(); handleImport(repoUrl); }} className="space-y-4 relative z-10">
                <div>
                  <input 
                    id="import-repo-url"
                    name="import-repo-url"
                    type="url" 
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    required
                    placeholder="https://github.com/user/repo" 
                    className="w-full px-4 py-3 bg-white border-4 border-cyber-border text-black focus:outline-none placeholder:text-neutral-500 font-mono shadow-[4px_4px_0px_#000] normal-case"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-3 bg-cyber-primary hover:bg-[#A000D0] text-black border-4 border-cyber-border font-bold transition-colors flex items-center justify-center gap-2 shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000]"
                >
                  <Plus className="w-5 h-5" />
                  INITIATE INGESTION
                </button>
              </form>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
