"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, LogOut, User as UserIcon, LayoutDashboard, Database, Settings, GitBranch, BrainCircuit, Activity, Trash2 } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3-.3 6-1.5 6-6.5a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 5 3 6.2 6 6.5a4.8 4.8 0 0 0-1 3.2v4" />
    </svg>
  );
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "repos" | "settings">("overview");
  const [repositories, setRepositories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Settings State
  const [defaultModel, setDefaultModel] = useState("llama3_70b");
  const [responseStyle, setResponseStyle] = useState("detailed");

  useEffect(() => {
    // Load local settings
    const savedModel = localStorage.getItem("rw_default_model");
    const savedStyle = localStorage.getItem("rw_response_style");
    if (savedModel) setDefaultModel(savedModel);
    if (savedStyle) setResponseStyle(savedStyle);
  }, []);

  const handleSaveSettings = (model: string, style: string) => {
    setDefaultModel(model);
    setResponseStyle(style);
    localStorage.setItem("rw_default_model", model);
    localStorage.setItem("rw_response_style", style);
  };

  useEffect(() => {
    const fetchRepos = async () => {
      if ((session?.user as any)?.id) {
        try {
          const res = await fetch(`http://localhost:8000/api/v1/repos/user/${(session?.user as any).id}`, {
            headers: {
              "X-User-Id": (session?.user as any).id
            }
          });
          if (res.ok) {
            const data = await res.json();
            setRepositories(data);
          }
        } catch (error) {
          console.error("Failed to fetch repos", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    if (status === "authenticated") {
      fetchRepos();
    }
  }, [session, status]);

  if (status === "loading") {
    return <div className="min-h-screen bg-cyber-canvas flex items-center justify-center text-cyber-cyan uppercase font-bold text-2xl drop-shadow-[2px_2px_0px_#000]">LOADING...</div>;
  }

  if (status === "unauthenticated") {
    router.push("/");
    return null;
  }

  return (
    <div className="relative min-h-screen bg-cyber-canvas text-white flex flex-col font-mono uppercase font-bold">
      {/* Lightweight CSS Retro Dot Background */}
      <div className="fixed inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle,#ffffff_2px,transparent_2px)] bg-[size:32px_32px] animate-slide-diagonal z-0" />
      
      {/* Top Navbar */}
      <header className="py-4 sm:h-16 border-b-4 border-cyber-border flex flex-wrap items-center px-4 sm:px-6 shrink-0 bg-cyber-canvas justify-between relative z-10 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 border-2 border-transparent hover:border-cyber-border hover:bg-cyber-panel transition-colors text-cyber-cyan hover:text-white flex items-center gap-2">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm hidden sm:inline">[GO BACK]</span>
          </button>
        </div>
        <div className="text-cyber-cyan flex items-center gap-2 drop-shadow-[2px_2px_0px_#000] text-lg sm:text-xl">
          <Activity className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
          <span className="hidden sm:inline">DEV CONTROL CENTER</span>
          <span className="sm:hidden">D.C.C.</span>
        </div>
      </header>

      {/* Main Split Layout */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-7xl mx-auto w-full border-x-4 border-cyber-border relative z-10">
        
        {/* Left Sidebar Tabs */}
        <aside className="w-full md:w-64 border-b-4 md:border-b-0 md:border-r-4 border-cyber-border p-6 flex flex-col gap-4 bg-cyber-canvas shrink-0">
          <div className="flex items-center gap-3 mb-6 p-2 bg-cyber-panel border-2 border-cyber-border shadow-[4px_4px_0px_#000]">
            <div className="w-12 h-12 bg-cyber-canvas border-2 border-cyber-border overflow-hidden relative shrink-0 flex items-center justify-center">
              {session?.user?.image ? (
                <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-6 h-6 text-white m-auto" />
              )}
            </div>
            <div className="overflow-hidden">
              <h2 className="text-sm truncate text-cyber-primary">{session?.user?.name || "DEVELOPER"}</h2>
              <p className="text-xs text-white truncate normal-case">Free Tier</p>
            </div>
          </div>

          <TabButton 
            active={activeTab === "overview"} 
            onClick={() => setActiveTab("overview")} 
            icon={<LayoutDashboard className="w-5 h-5" />} 
            label="OVERVIEW" 
          />
          <TabButton 
            active={activeTab === "repos"} 
            onClick={() => setActiveTab("repos")} 
            icon={<Database className="w-5 h-5" />} 
            label="REPOSITORIES" 
          />
          <TabButton 
            active={activeTab === "settings"} 
            onClick={() => setActiveTab("settings")} 
            icon={<Settings className="w-5 h-5" />} 
            label="SETTINGS & AI" 
          />

          <div className="mt-auto pt-6">
            <button 
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full py-3 px-4 flex items-center justify-center gap-3 text-sm text-black bg-rose-500 border-2 border-cyber-border shadow-[4px_4px_0px_#000] hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-[2px_2px_0px_#000] transition-all"
            >
              <LogOut className="w-5 h-5" />
              SYSTEM LOGOUT
            </button>
          </div>
        </aside>

        {/* Right Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 bg-cyber-canvas relative">
          
          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8 max-w-4xl"
              >
                <div className="bg-cyber-panel border-4 border-cyber-border p-6 shadow-[8px_8px_0px_#000]">
                  <h1 className="text-3xl text-cyber-cyan drop-shadow-[2px_2px_0px_#000] mb-2">WELCOME BACK, {session?.user?.name?.split(' ')[0] || "DEVELOPER"}</h1>
                  <p className="text-white normal-case">High-level architectural command center active.</p>
                </div>

                {/* Real Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <StatCard 
                    title="REPOSITORIES INDEXED" 
                    value={isLoading ? "-" : repositories.length.toString()} 
                    icon={<Database className="w-6 h-6 text-cyber-primary" />} 
                  />
                  <StatCard 
                    title="CURRENT PLAN" 
                    value="FREE TIER" 
                    icon={<Activity className="w-6 h-6 text-emerald-400" />} 
                  />
                </div>

                {/* Connected Accounts */}
                <div className="p-6 bg-cyber-panel border-4 border-cyber-border shadow-[8px_8px_0px_#000]">
                  <h3 className="text-xl text-cyber-cyan mb-6 flex items-center gap-2 drop-shadow-[2px_2px_0px_#000]">
                    <GithubIcon className="w-6 h-6 text-white shrink-0" />
                    CONNECTED ACCOUNTS
                  </h3>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-cyber-canvas border-2 border-cyber-border shadow-[4px_4px_0px_#000] gap-4">
                    <div className="flex items-center gap-4 w-full sm:w-auto overflow-hidden">
                      <div className="w-12 h-12 shrink-0 bg-white text-black flex items-center justify-center border-2 border-cyber-border shadow-[2px_2px_0px_#BD00FF]">
                        <GithubIcon className="w-8 h-8" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-lg text-cyber-primary">GITHUB</p>
                        <p className="text-sm text-white normal-case truncate">{session?.user?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center w-full sm:w-auto gap-2 bg-emerald-500 text-black px-4 py-2 border-2 border-cyber-border shadow-[2px_2px_0px_#000]">
                      [ CONNECTED ]
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "repos" && (
              <motion.div 
                key="repos"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 max-w-4xl"
              >
                <div className="bg-cyber-panel border-4 border-cyber-border p-6 shadow-[8px_8px_0px_#000]">
                  <h1 className="text-3xl text-cyber-cyan drop-shadow-[2px_2px_0px_#000] mb-2">INDEXED REPOSITORIES</h1>
                  <p className="text-white normal-case">Codebases currently mapped in the Knowledge Graph.</p>
                </div>

                {isLoading ? (
                  <div className="text-cyber-cyan text-xl animate-pulse bg-cyber-panel p-6 border-4 border-cyber-border">SCANNING DATABASE...</div>
                ) : repositories.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6">
                    {repositories.map(repo => (
                      <div key={repo.id} className="p-6 bg-cyber-panel border-4 border-cyber-border shadow-[8px_8px_0px_#000] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-4 mb-2">
                            <Link href={`/repo/${repo.id}`} className="text-2xl text-cyber-primary hover:text-white transition-colors drop-shadow-[2px_2px_0px_#000]">
                              {repo.name}
                            </Link>
                            {repo.score !== null && (
                              <span className={`px-3 py-1 text-sm border-2 border-cyber-border shadow-[2px_2px_0px_#000] ${repo.score >= 80 ? 'bg-emerald-500 text-black' : repo.score >= 50 ? 'bg-amber-500 text-black' : 'bg-rose-500 text-black'}`}>
                                SCORE: {repo.score}/100
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-white normal-case flex items-center gap-2 mt-2">
                            <GitBranch className="w-4 h-4 text-cyber-cyan" />
                            {repo.github_url?.replace("https://github.com/", "")}
                          </p>
                        </div>
                        <Link href={`/repo/${repo.id}`} className="px-6 py-3 bg-cyber-cyan text-black border-2 border-cyber-border shadow-[4px_4px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_#000] transition-all whitespace-nowrap">
                          OPEN GRAPH
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 border-4 border-dashed border-cyber-border bg-cyber-panel shadow-[8px_8px_0px_#000] text-center text-white">
                    NO REPOSITORIES INDEXED YET.
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "settings" && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8 max-w-4xl"
              >
                <div className="bg-cyber-panel border-4 border-cyber-border p-6 shadow-[8px_8px_0px_#000]">
                  <h1 className="text-3xl text-cyber-cyan drop-shadow-[2px_2px_0px_#000] mb-2">AI PREFERENCES</h1>
                  <p className="text-white normal-case">Configure how the Walkthrough Tutor and Interviewer behave.</p>
                </div>

                <div className="p-8 bg-cyber-panel border-4 border-cyber-border shadow-[8px_8px_0px_#000] space-y-10">
                  
                  {/* Default Model */}
                  <div>
                    <h3 className="text-xl text-cyber-primary mb-6 flex items-center gap-3 drop-shadow-[2px_2px_0px_#000]">
                      <BrainCircuit className="w-6 h-6 text-white" /> SYSTEM MODEL
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <RadioOption 
                        selected={defaultModel === "llama3_70b"} 
                        onClick={() => handleSaveSettings("llama3_70b", responseStyle)} 
                        label="Llama 3.3 70B" 
                        sub="Fast, extremely capable." 
                      />
                      <RadioOption 
                        selected={defaultModel === "llama3_8b"} 
                        onClick={() => handleSaveSettings("llama3_8b", responseStyle)} 
                        label="Llama 3.1 8B" 
                        sub="Blazing fast, 560 tokens/sec." 
                      />
                      <RadioOption 
                        selected={defaultModel === "gpt_oss_120b"} 
                        onClick={() => handleSaveSettings("gpt_oss_120b", responseStyle)} 
                        label="GPT OSS 120B" 
                        sub="Massive context & quality." 
                      />
                      <RadioOption 
                        selected={defaultModel === "gpt_oss_20b"} 
                        onClick={() => handleSaveSettings("gpt_oss_20b", responseStyle)} 
                        label="GPT OSS 20B" 
                        sub="Incredibly fast open source GPT." 
                      />
                    </div>
                  </div>

                  <div className="h-1 bg-cyber-border w-full" />

                  {/* Response Style */}
                  <div>
                    <h3 className="text-xl text-cyber-primary mb-6 flex items-center gap-3 drop-shadow-[2px_2px_0px_#000]">
                      <MessageSquareIcon className="w-6 h-6 text-white" /> RESPONSE STYLE
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <RadioOption 
                        selected={responseStyle === "brief"} 
                        onClick={() => handleSaveSettings(defaultModel, "brief")} 
                        label="BRIEF & CONCISE" 
                        sub="To the point answers." 
                      />
                      <RadioOption 
                        selected={responseStyle === "detailed"} 
                        onClick={() => handleSaveSettings(defaultModel, "detailed")} 
                        label="DETAILED WALKTHROUGH" 
                        sub="Deep architectural context." 
                      />
                      <RadioOption 
                        selected={responseStyle === "code_heavy"} 
                        onClick={() => handleSaveSettings(defaultModel, "code_heavy")} 
                        label="CODE HEAVY" 
                        sub="Prioritize code snippets." 
                      />
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// Subcomponents

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full text-left px-4 py-4 flex items-center gap-4 transition-all border-2 shadow-[4px_4px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_#000] ${
        active ? "bg-cyber-primary text-black border-cyber-border font-bold text-lg drop-shadow-[1px_1px_0px_#fff]" : "bg-cyber-panel text-white border-cyber-border hover:bg-cyber-cyan hover:text-black"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="p-6 bg-cyber-panel border-4 border-cyber-border shadow-[8px_8px_0px_#000] flex flex-col gap-4 hover:-translate-y-1 transition-transform">
      <div className="w-14 h-14 bg-cyber-canvas border-2 border-cyber-border flex items-center justify-center shadow-[4px_4px_0px_#BD00FF]">
        {icon}
      </div>
      <div>
        <p className="text-sm text-cyber-cyan">{title}</p>
        <p className="text-4xl text-white drop-shadow-[2px_2px_0px_#000] mt-1">{value}</p>
      </div>
    </div>
  );
}

function RadioOption({ selected, onClick, label, sub }: { selected: boolean, onClick: () => void, label: string, sub: string }) {
  return (
    <button 
      onClick={onClick}
      className={`text-left p-5 border-4 transition-all shadow-[4px_4px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_#000] flex flex-col justify-between ${
        selected ? "bg-cyber-cyan text-black border-cyber-border" : "bg-cyber-canvas text-white border-cyber-border hover:bg-cyber-panel"
      }`}
    >
      <div className="flex items-center justify-between w-full mb-2">
        <span className="text-lg drop-shadow-[1px_1px_0px_rgba(255,255,255,0.3)]">{label}</span>
        <div className={`w-6 h-6 border-2 flex items-center justify-center bg-white ${selected ? "border-cyber-border" : "border-cyber-border"}`}>
          {selected && <div className="w-3 h-3 bg-cyber-primary border-2 border-cyber-border" />}
        </div>
      </div>
      <p className={`text-sm normal-case ${selected ? "text-neutral-900 font-bold" : "text-neutral-400"}`}>{sub}</p>
    </button>
  );
}

function MessageSquareIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  );
}
