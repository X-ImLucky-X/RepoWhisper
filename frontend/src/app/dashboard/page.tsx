"use client";

import { motion } from "framer-motion";
import { FolderGit2, Plus, ArrowRight, Activity, Search, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

const dummyRepos = [
  { id: 1, name: "ecommerce-api", status: "COMPLETED", tech: ["Node.js", "Express", "MongoDB"], date: "2 days ago" },
  { id: 2, name: "portfolio-v2", status: "COMPLETED", tech: ["Next.js", "Tailwind", "React"], date: "5 days ago" },
  { id: 3, name: "python-web-scraper", status: "PARSING", tech: ["Python", "BeautifulSoup"], date: "Just now" },
];

export default function Dashboard() {
  const { data: session } = useSession();
  const [repoUrl, setRepoUrl] = useState("");

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Connect to FastAPI backend to trigger ingestion
    console.log("Importing:", repoUrl);
    setRepoUrl("");
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
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
            <button 
              onClick={() => signOut({ callbackUrl: "/" })}
              className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
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
              {dummyRepos.map((repo, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={repo.id}
                  className="p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{repo.name}</h3>
                      {repo.status === "COMPLETED" ? (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Ready</span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                          <Activity className="w-3 h-3 animate-pulse" /> Parsing
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                      <span>Imported {repo.date}</span>
                      <span>•</span>
                      <div className="flex gap-1">
                        {repo.tech.map(t => (
                          <span key={t} className="px-2 py-0.5 rounded-md bg-white/5">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button className="hidden sm:flex p-2 rounded-lg bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center hover:bg-white/10">
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Sidebar (Import Widget) */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 bg-indigo-500/20 blur-3xl rounded-full" />
              <h2 className="text-lg font-semibold mb-2 relative z-10">Import Repository</h2>
              <p className="text-sm text-indigo-200/70 mb-6 relative z-10">
                Paste a public GitHub URL to generate a cheat sheet and start a mock interview session.
              </p>
              
              <form onSubmit={handleImport} className="space-y-4 relative z-10">
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
    </div>
  );
}
