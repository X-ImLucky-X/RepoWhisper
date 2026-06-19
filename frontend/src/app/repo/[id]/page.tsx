"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, User, ChevronLeft, FileText, Code2, MessageSquareCode, FolderTree, FileCode, X, Activity, AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";
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
      <div className="bg-rose-500 border-2 border-cyber-border text-black p-4 my-4 text-sm flex flex-col gap-2 max-w-full overflow-hidden shadow-[4px_4px_0px_#000]">
        <strong className="font-bold text-lg">⚠️ DIAGRAM GENERATION FAILED</strong>
        <p className="whitespace-normal break-words normal-case">The AI generated invalid flowchart syntax. Please ask it to try again and keep the diagram simpler.</p>
        <pre className="text-xs bg-black text-rose-400 p-2 overflow-x-auto whitespace-pre-wrap break-all border-2 border-cyber-border">{chart}</pre>
      </div>
    );
  }

  return <div className="bg-cyber-canvas border-2 border-cyber-border shadow-[4px_4px_0px_#000] p-4 my-4 overflow-x-auto flex justify-center" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default function MockInterviewPage() {
  const params = useParams();
  const repoId = params?.id as string;
  
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [cheatSheet, setCheatSheet] = useState<string>("Loading cheat sheet...");
  const [repoTree, setRepoTree] = useState<string>("Loading knowledge graph...");
  const [scorecard, setScorecard] = useState<any>(null);
  const [graphData, setGraphData] = useState<{nodes: any[], links: any[]} | null>(null);
  const [repoName, setRepoName] = useState<string>("Loading...");
  const [leftTab, setLeftTab] = useState<"summary" | "tree" | "scorecard">("summary");
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
          if (data.scorecard) setScorecard(data.scorecard);
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
      const aiModel = localStorage.getItem("rw_default_model") || "llama3_70b";
      const responseStyle = localStorage.getItem("rw_response_style") || "detailed";

      const res = await fetch("http://localhost:8000/api/v1/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repository_id: repoId,
          message: userMessage,
          mode: chatMode,
          ai_model: aiModel,
          response_style: responseStyle
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
        const aiModel = localStorage.getItem("rw_default_model") || "llama3";
        const responseStyle = localStorage.getItem("rw_response_style") || "detailed";

        const res = await fetch(`http://localhost:8000/api/v1/chat/explain`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repository_id: repoId,
            file_path: node.id,
            ai_model: aiModel,
            response_style: responseStyle
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
    <div className="h-screen bg-cyber-canvas text-white flex flex-col uppercase font-mono font-bold overflow-hidden">
      
      {/* Top Navbar */}
      <header className="h-16 border-b-4 border-cyber-border flex items-center justify-between px-6 shrink-0 bg-cyber-canvas z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-cyber-cyan hover:text-white transition-colors drop-shadow-[2px_2px_0px_#000]">
            <MessageSquareCode className="w-6 h-6" />
            <span className="text-xl hidden sm:block">RepoWhisper</span>
          </Link>
          <div className="h-6 w-1 bg-cyber-border" />
          <Link href="/dashboard" className="p-2 border-2 border-transparent hover:border-cyber-border bg-transparent hover:bg-cyber-panel transition-colors text-cyber-primary" title="Back to Dashboard">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-cyber-primary" />
            <h1 className="text-xl drop-shadow-[2px_2px_0px_#000]">{repoName}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-cyber-panel border-2 border-cyber-border p-1 shadow-[4px_4px_0px_#000]">
          <button 
            onClick={() => setChatMode("interview")}
            className={`px-4 py-1 border-2 transition-colors flex items-center gap-2 ${chatMode === "interview" ? "bg-emerald-500 text-black border-cyber-border" : "text-neutral-400 border-transparent hover:text-white"}`}
          >
            <div className={`w-2 h-2 ${chatMode === "interview" ? "bg-black animate-pulse" : "bg-transparent"}`} />
            MOCK INTERVIEW
          </button>
          <button 
            onClick={() => setChatMode("walkthrough")}
            className={`px-4 py-1 border-2 transition-colors flex items-center gap-2 ${chatMode === "walkthrough" ? "bg-cyber-cyan text-black border-cyber-border" : "text-neutral-400 border-transparent hover:text-white"}`}
          >
            <div className={`w-2 h-2 ${chatMode === "walkthrough" ? "bg-black animate-pulse" : "bg-transparent"}`} />
            WALKTHROUGH TUTOR
          </button>
        </div>
      </header>

      {/* Main Split Layout */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden border-x-4 border-b-4 border-cyber-border">
        
        {/* Left Panel: Cheat Sheet & Tree */}
        <div className="w-full lg:w-1/2 border-r-4 border-cyber-border flex flex-col bg-cyber-canvas">
          <div className="px-6 pt-4 border-b-4 border-cyber-border flex items-center gap-6 bg-cyber-panel">
            <button 
              onClick={() => setLeftTab("summary")}
              className={`flex items-center gap-2 text-lg transition-colors pb-4 -mb-px border-b-4 ${leftTab === "summary" ? "text-cyber-cyan border-cyber-cyan" : "text-neutral-500 border-transparent hover:text-white"}`}
            >
              <FileText className="w-5 h-5" />
              EXECUTIVE SUMMARY
            </button>
            <button 
              onClick={() => setLeftTab("tree")}
              className={`flex items-center gap-2 text-lg transition-colors pb-4 -mb-px border-b-4 ${leftTab === "tree" ? "text-cyber-primary border-cyber-primary" : "text-neutral-500 border-transparent hover:text-white"}`}
            >
              <FolderTree className="w-5 h-5" />
              KNOWLEDGE GRAPH
            </button>
            <button 
              onClick={() => setLeftTab("scorecard")}
              className={`flex items-center gap-2 text-lg transition-colors pb-4 -mb-px border-b-4 ${leftTab === "scorecard" ? "text-emerald-400 border-emerald-400" : "text-neutral-500 border-transparent hover:text-white"}`}
            >
              <Activity className="w-5 h-5" />
              ARCHITECTURE SCORE
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 relative custom-scrollbar">
            {leftTab === "summary" ? (
              <div className="prose prose-invert prose-indigo max-w-none normal-case font-mono font-normal">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{cheatSheet}</ReactMarkdown>
              </div>
            ) : leftTab === "scorecard" ? (
              <div className="max-w-2xl mx-auto space-y-8">
                {scorecard ? (
                  <>
                    <div className="flex items-center justify-between p-6 bg-cyber-panel border-4 border-cyber-border shadow-[8px_8px_0px_#000]">
                      <div>
                        <h2 className="text-3xl text-cyber-cyan drop-shadow-[2px_2px_0px_#000] mb-1">HEALTH SCORE</h2>
                        <p className="text-white normal-case font-mono">Automated evaluation by AI</p>
                      </div>
                      <div className={`w-24 h-24 flex items-center justify-center text-5xl font-black border-4 shadow-[4px_4px_0px_#000] ${scorecard.score >= 80 ? 'text-black border-cyber-border bg-emerald-500' : scorecard.score >= 50 ? 'text-black border-cyber-border bg-amber-500' : 'text-black border-cyber-border bg-rose-500'}`}>
                        {scorecard.score}
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      {scorecard.circular_dependencies && scorecard.circular_dependencies.length > 0 && (
                        <div className="p-6 bg-rose-500 border-4 border-cyber-border text-black shadow-[8px_8px_0px_#000]">
                          <h3 className="text-xl font-black flex items-center gap-2 mb-4">
                            <Activity className="w-6 h-6" /> CIRCULAR DEPENDENCIES
                          </h3>
                          <ul className="list-disc pl-5 text-sm normal-case space-y-1 font-mono font-bold">
                            {scorecard.circular_dependencies.map((dep: string, i: number) => <li key={i}>{dep}</li>)}
                          </ul>
                        </div>
                      )}
                      
                      {scorecard.dead_files && scorecard.dead_files.length > 0 && (
                        <div className="p-6 bg-amber-500 border-4 border-cyber-border text-black shadow-[8px_8px_0px_#000]">
                          <h3 className="text-xl font-black flex items-center gap-2 mb-4">
                            <AlertTriangle className="w-6 h-6" /> DEAD / UNUSED FILES
                          </h3>
                          <ul className="list-disc pl-5 text-sm normal-case space-y-1 font-mono font-bold">
                            {scorecard.dead_files.map((file: string, i: number) => <li key={i}>{file}</li>)}
                          </ul>
                        </div>
                      )}

                      {scorecard.security_risks && scorecard.security_risks.length > 0 && (
                        <div className="p-6 bg-rose-600 border-4 border-cyber-border text-black shadow-[8px_8px_0px_#000]">
                          <h3 className="text-xl font-black flex items-center gap-2 mb-4">
                            <ShieldAlert className="w-6 h-6" /> SECURITY RISKS
                          </h3>
                          <ul className="list-disc pl-5 text-sm normal-case space-y-1 font-mono font-bold">
                            {scorecard.security_risks.map((risk: string, i: number) => <li key={i}>{risk}</li>)}
                          </ul>
                        </div>
                      )}

                      {(!scorecard.circular_dependencies?.length && !scorecard.dead_files?.length && !scorecard.security_risks?.length) && (
                        <div className="p-6 bg-emerald-500 border-4 border-cyber-border text-black shadow-[8px_8px_0px_#000] flex items-center gap-4">
                          <CheckCircle2 className="w-10 h-10" />
                          <div>
                            <h3 className="text-2xl font-black">CODEBASE IS PRISTINE!</h3>
                            <p className="text-sm normal-case font-mono font-bold mt-1">No structural issues, dead files, or security risks were found.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-10 border-4 border-dashed border-cyber-border bg-cyber-panel shadow-[8px_8px_0px_#000] text-center text-white">
                    SCORECARD IS PENDING OR UNAVAILABLE FOR THIS REPOSITORY.
                  </div>
                )}
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0B0F19] overflow-hidden">
                {graphData ? (
                   <>
                     <ForceGraph3D 
                        graphData={graphData} 
                        nodeLabel="id" 
                        nodeAutoColorBy="group" 
                        nodeResolution={8}
                        cooldownTicks={100}
                        backgroundColor="#0B0F19"
                        onNodeClick={handleNodeClick}
                     />
                     
                     <AnimatePresence>
                       {selectedFile && (
                         <motion.div 
                           initial={{ x: 400, opacity: 0 }}
                           animate={{ x: 0, opacity: 1 }}
                           exit={{ x: 400, opacity: 0 }}
                           transition={{ type: "spring", stiffness: 300, damping: 30 }}
                           className="absolute right-0 top-0 bottom-0 w-[400px] bg-cyber-panel border-l-4 border-cyber-border p-6 overflow-y-auto custom-scrollbar flex flex-col shadow-[-8px_0px_0px_#000] z-10"
                         >
                           <div className="flex justify-between items-start mb-6">
                             <h3 className="text-lg text-cyber-cyan flex items-center gap-2 break-all drop-shadow-[1px_1px_0px_#000]">
                               <FileCode className="w-6 h-6 shrink-0" />
                               {selectedFile.split('/').pop()}
                             </h3>
                             <button onClick={() => setSelectedFile(null)} className="text-white bg-rose-500 border-2 border-cyber-border hover:bg-rose-600 transition-colors p-1 ml-2 shadow-[2px_2px_0px_#000]">
                               <X className="w-5 h-5" />
                             </button>
                           </div>
                           
                           <div className="flex-1 prose prose-invert prose-sm max-w-none normal-case font-mono font-normal prose-p:leading-relaxed prose-headings:text-cyber-primary prose-headings:font-bold prose-headings:mt-6 prose-headings:mb-2 prose-ul:mt-2">
                             {isExplaining ? (
                               <div className="flex flex-col gap-4 animate-pulse mt-4">
                                 <div className="h-4 bg-cyber-border w-3/4"></div>
                                 <div className="h-4 bg-cyber-border w-full"></div>
                                 <div className="h-4 bg-cyber-border w-5/6"></div>
                                 <div className="h-4 bg-cyber-border w-1/2 mt-4"></div>
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
                   <pre className="text-sm font-mono normal-case font-normal text-white whitespace-pre overflow-x-auto p-6">
                     {repoTree}
                   </pre>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Chat Interface */}
        <div className="w-full lg:w-1/2 flex flex-col bg-cyber-canvas relative">
          
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {messages.map((msg, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={idx} 
                className={`flex gap-4 max-w-[85%] ${msg.role === "USER" ? "ml-auto flex-row-reverse" : ""}`}
              >
                <div className={`w-10 h-10 shrink-0 flex items-center justify-center border-2 border-cyber-border shadow-[2px_2px_0px_#000] ${msg.role === "USER" ? "bg-cyber-cyan text-black" : "bg-cyber-primary text-black"}`}>
                  {msg.role === "USER" ? <User className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
                </div>
                <div className={`min-w-0 overflow-hidden p-5 border-2 border-cyber-border shadow-[4px_4px_0px_#000] text-sm leading-relaxed normal-case font-mono font-normal ${msg.role === "USER" ? "bg-white text-black" : "bg-cyber-panel text-white prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-[#0B0F19] prose-pre:border-2 prose-pre:border-cyber-border prose-pre:shadow-[4px_4px_0px_#000]"}`}>
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
          <div className="p-6 bg-cyber-panel border-t-4 border-cyber-border">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="DISCUSS YOUR CODEBASE OR ASK A QUESTION..."
                className="w-full pl-4 pr-16 py-4 bg-white border-4 border-cyber-border text-black shadow-[4px_4px_0px_#000] focus:outline-none focus:ring-0 placeholder:text-neutral-500 font-mono font-bold uppercase transition-all"
              />
              <button 
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-3 bg-cyber-primary border-4 border-cyber-border hover:bg-[#A000D0] disabled:bg-neutral-800 disabled:text-neutral-500 text-black shadow-[2px_2px_0px_#000] transition-colors hover:translate-y-[1px] hover:translate-x-[1px]"
              >
                {isLoading ? <div className="w-5 h-5 border-4 border-black border-t-transparent rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          </div>

        </div>
      </main>
    </div>
  );
}
