"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, User, ChevronLeft, FileText, Code2, MessageSquareCode, FolderTree, FileCode, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import dynamic from "next/dynamic";
import mermaid from "mermaid";

const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false });

function Mermaid({ chart }: { chart: string }) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(false);
  const id = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);
  
  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'dark' });
    
    // Auto-fix common LLM hallucinated syntax errors
    let cleanChart = chart.replace(/-->\|([^|]+)\|>/g, '-->|$1|');
    cleanChart = cleanChart.replace(/--->/g, '-->');
    
    // Auto-quote unquoted node labels to prevent parenthesis/space crashes
    // This turns D[Task Storage (Supabase)] into D["Task Storage (Supabase)"]
    cleanChart = cleanChart.replace(/\[([^"\]]+)\]/g, '["$1"]');
    
    mermaid.render(id.current, cleanChart)
      .then((result) => {
        setSvg(result.svg);
        setError(false);
      })
      .catch((e) => {
        console.error("Mermaid Render Error:", e);
        setError(true);
      });
  }, [chart]);
  
  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-4 my-4 text-sm flex flex-col gap-2 max-w-full overflow-hidden">
        <strong>⚠️ Diagram Generation Failed</strong>
        <p className="whitespace-normal break-words">The AI generated invalid flowchart syntax. Please ask it to try again and keep the diagram simpler.</p>
        <pre className="text-xs bg-red-950/50 p-2 rounded overflow-x-auto whitespace-pre-wrap break-all">{chart}</pre>
      </div>
    );
  }

  return <div className="bg-neutral-900 rounded-lg p-4 my-4 overflow-x-auto flex justify-center" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default function MockInterviewPage() {
  const params = useParams();
  const repoId = params?.id as string;
  
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [cheatSheet, setCheatSheet] = useState<string>("Loading cheat sheet...");
  const [repoTree, setRepoTree] = useState<string>("Loading knowledge graph...");
  const [graphData, setGraphData] = useState<{nodes: any[], links: any[]} | null>(null);
  const [repoName, setRepoName] = useState<string>("Loading...");
  const [leftTab, setLeftTab] = useState<"summary" | "tree">("summary");
  const [chatMode, setChatMode] = useState<"interview" | "walkthrough">("interview");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Explain Like I'm New Sidebar State
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileExplanation, setFileExplanation] = useState<string>("");
  const [isExplaining, setIsExplaining] = useState<boolean>(false);

  useEffect(() => {
    // Fetch Repo Details (Cheat Sheet)
    const fetchRepo = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/repos/${repoId}`);
        if (res.ok) {
          const data = await res.json();
          setRepoName(data.name);
          setCheatSheet(data.summary || "No summary available yet. It might still be parsing.");
          setRepoTree(data.tree || "No knowledge graph available.");
          if (data.graph_json) {
            setGraphData(data.graph_json);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    // Fetch Chat History
    const fetchHistory = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/chat/history/${repoId}?mode=${chatMode}`);
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            setMessages(data);
          } else {
            const initialMessage = chatMode === "interview" 
              ? "I've reviewed your repository. Let's begin the technical interview. Can you walk me through your architecture?"
              : "Hi! I'm your Walkthrough Tutor. I've reviewed your codebase. What part of the architecture would you like me to explain?";
            setMessages([{ role: "AI", content: initialMessage }]);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    if (repoId) {
      fetchRepo();
      fetchHistory();
    }
  }, [repoId, chatMode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    // Add user message to UI
    setMessages(prev => [...prev, { role: "USER", content: userMessage }]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/v1/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repository_id: repoId,
          message: userMessage,
          mode: chatMode
        })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: "AI", content: data.reply }]);
      }
    } catch (error) {
      console.error("Chat error", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNodeClick = async (node: any) => {
    if (node.group === "file") {
      setSelectedFile(node.id);
      setIsExplaining(true);
      setFileExplanation("");
      
      try {
        const res = await fetch(`http://localhost:8000/api/v1/chat/explain`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repository_id: repoId,
            file_path: node.id
          })
        });
        const data = await res.json();
        setFileExplanation(data.reply);
      } catch (err) {
        setFileExplanation("Failed to fetch explanation.");
      } finally {
        setIsExplaining(false);
      }
    }
  };

  return (
    <div className="h-screen bg-neutral-950 text-neutral-50 flex flex-col font-sans overflow-hidden">
      
      {/* Top Navbar */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 shrink-0 bg-neutral-900/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors">
            <MessageSquareCode className="w-6 h-6" />
            <span className="font-bold hidden sm:block text-white">RepoWhisper</span>
          </Link>
          <div className="h-6 w-px bg-white/10" />
          <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-colors text-neutral-400 hover:text-white" title="Back to Dashboard">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-indigo-400" />
            <h1 className="font-semibold tracking-tight">{repoName}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-neutral-900/50 border border-white/10 rounded-full p-1">
          <button 
            onClick={() => setChatMode("interview")}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center gap-2 ${chatMode === "interview" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${chatMode === "interview" ? "bg-emerald-500 animate-pulse" : "bg-transparent"}`} />
            Mock Interview
          </button>
          <button 
            onClick={() => setChatMode("walkthrough")}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center gap-2 ${chatMode === "walkthrough" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_-3px_rgba(99,102,241,0.3)]" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${chatMode === "walkthrough" ? "bg-indigo-500 animate-pulse" : "bg-transparent"}`} />
            Walkthrough Tutor
          </button>
        </div>
      </header>

      {/* Main Split Layout */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Panel: Cheat Sheet & Tree */}
        <div className="w-full lg:w-1/2 border-r border-white/10 flex flex-col bg-neutral-950/50">
          <div className="px-6 pt-4 border-b border-white/10 flex items-center gap-6 bg-neutral-900/30">
            <button 
              onClick={() => setLeftTab("summary")}
              className={`flex items-center gap-2 font-semibold transition-colors pb-4 -mb-px border-b-2 ${leftTab === "summary" ? "text-indigo-400 border-indigo-400" : "text-neutral-500 border-transparent hover:text-neutral-300"}`}
            >
              <FileText className="w-4 h-4" />
              Executive Summary
            </button>
            <button 
              onClick={() => setLeftTab("tree")}
              className={`flex items-center gap-2 font-semibold transition-colors pb-4 -mb-px border-b-2 ${leftTab === "tree" ? "text-indigo-400 border-indigo-400" : "text-neutral-500 border-transparent hover:text-neutral-300"}`}
            >
              <FolderTree className="w-4 h-4" />
              Knowledge Graph
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 relative">
            {leftTab === "summary" ? (
              <div className="prose prose-invert prose-indigo max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{cheatSheet}</ReactMarkdown>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-950 overflow-hidden">
                {graphData ? (
                   <>
                     <ForceGraph3D 
                        graphData={graphData} 
                        nodeLabel="id" 
                        nodeAutoColorBy="group" 
                        nodeResolution={8}
                        cooldownTicks={100}
                        backgroundColor="#0a0a0a"
                        onNodeClick={handleNodeClick}
                     />
                     
                     <AnimatePresence>
                       {selectedFile && (
                         <motion.div 
                           initial={{ x: 400, opacity: 0 }}
                           animate={{ x: 0, opacity: 1 }}
                           exit={{ x: 400, opacity: 0 }}
                           transition={{ type: "spring", stiffness: 300, damping: 30 }}
                           className="absolute right-0 top-0 bottom-0 w-80 bg-neutral-900/80 backdrop-blur-xl border-l border-white/10 p-6 overflow-y-auto flex flex-col shadow-2xl z-10"
                         >
                           <div className="flex justify-between items-start mb-6">
                             <h3 className="text-sm font-bold text-white flex items-center gap-2 break-all">
                               <FileCode className="w-5 h-5 text-indigo-400 shrink-0" />
                               {selectedFile.split('/').pop()}
                             </h3>
                             <button onClick={() => setSelectedFile(null)} className="text-neutral-400 hover:text-white transition-colors p-1 bg-white/5 rounded-md hover:bg-white/10 ml-2">
                               <X className="w-4 h-4" />
                             </button>
                           </div>
                           
                           <div className="flex-1 prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-headings:text-indigo-300 prose-headings:font-bold prose-headings:mt-6 prose-headings:mb-2 prose-ul:mt-2">
                             {isExplaining ? (
                               <div className="flex flex-col gap-4 animate-pulse mt-4">
                                 <div className="h-4 bg-white/10 rounded w-3/4"></div>
                                 <div className="h-4 bg-white/10 rounded w-full"></div>
                                 <div className="h-4 bg-white/10 rounded w-5/6"></div>
                                 <div className="h-4 bg-white/10 rounded w-1/2 mt-4"></div>
                               </div>
                             ) : (
                               <ReactMarkdown remarkPlugins={[remarkGfm]}>{fileExplanation}</ReactMarkdown>
                             )}
                           </div>
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </>
                ) : (
                   <pre className="text-sm font-mono text-neutral-300 whitespace-pre overflow-x-auto p-6">
                     {repoTree}
                   </pre>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Chat Interface */}
        <div className="w-full lg:w-1/2 flex flex-col bg-neutral-900/20 relative">
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/5 rounded-full blur-[100px] pointer-events-none" />

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={idx} 
                className={`flex gap-4 max-w-[85%] ${msg.role === "USER" ? "ml-auto flex-row-reverse" : ""}`}
              >
                <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${msg.role === "USER" ? "bg-indigo-500 text-white" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"}`}>
                  {msg.role === "USER" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                <div className={`min-w-0 overflow-hidden p-4 rounded-2xl text-sm leading-relaxed ${msg.role === "USER" ? "bg-indigo-500 text-white rounded-tr-sm" : "bg-white/5 border border-white/10 text-neutral-300 rounded-tl-sm prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-white/10"}`}>
                  {msg.role === "USER" ? (
                    msg.content
                  ) : (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({node, inline, className, children, ...props}: any) {
                          const match = /language-(\w+)/.exec(className || '')
                          if (!inline && match && match[1] === 'mermaid') {
                            return <Mermaid chart={String(children).replace(/\n$/, '')} />
                          }
                          return <code className={className} {...props}>{children}</code>
                        }
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 bg-neutral-900/50 border-t border-white/10 backdrop-blur-md">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Discuss your codebase or ask a question..."
                className="w-full pl-4 pr-12 py-4 bg-neutral-950 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-neutral-600"
              />
              <button 
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-lg transition-colors"
              >
                {isLoading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>

        </div>
      </main>
    </div>
  );
}
