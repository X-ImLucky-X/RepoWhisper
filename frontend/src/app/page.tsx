"use client";

import { motion } from "framer-motion";
import { Terminal, GitMerge, MessageSquareCode, ArrowRight } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  return (
    <div className="relative min-h-screen bg-cyber-canvas text-white overflow-hidden uppercase font-bold">
      {/* Lightweight CSS Retro Dot Background */}
      <div className="fixed inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle,#ffffff_2px,transparent_2px)] bg-[size:32px_32px] animate-slide-diagonal [mask-image:repeating-linear-gradient(to_bottom_right,transparent_0%,white_15%,transparent_30%)] z-0" />
      
      {/* Navbar */}
      <nav className="relative z-10 flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto border-b-2 border-cyber-border bg-cyber-canvas gap-4">
        <div className="flex items-center gap-2">
          <MessageSquareCode className="w-8 h-8 text-cyber-primary" />
          <span className="text-xl tracking-tight">RepoWhisper</span>
        </div>
        
        {status === "loading" ? (
          <div className="h-10 w-32 bg-cyber-panel border-2 border-cyber-border" />
        ) : session ? (
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link href="/profile" className="text-sm text-cyber-cyan hover:text-white transition-colors shrink-0">
              [Profile]
            </Link>
            <Link href="/dashboard" className="px-4 py-2 bg-cyber-primary border-2 border-cyber-border shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] transition-all text-black flex items-center gap-2 whitespace-nowrap shrink-0">
              Go to Dashboard <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>
          </div>
        ) : (
          <button 
            onClick={() => signIn("github", { callbackUrl: '/dashboard' })}
            className="px-4 py-2 bg-cyber-cyan border-2 border-cyber-border shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] transition-all text-black flex items-center gap-2"
          >
            <GithubIcon className="w-4 h-4" />
            Sign in with GitHub
          </button>
        )}
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center pt-16 sm:pt-24 pb-16 sm:pb-20 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1 bg-cyber-panel border-2 border-cyber-border text-cyber-cyan text-sm mb-8 shadow-[4px_4px_0px_#000]"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full bg-cyber-cyan opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 bg-cyber-cyan"></span>
          </span>
          System Online
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-7xl tracking-tight max-w-4xl mx-auto leading-none text-white drop-shadow-[4px_4px_0px_#BD00FF]"
        >
          DEFEND YOUR CODE IN <br className="hidden md:block" />
          <span className="text-cyber-cyan drop-shadow-[4px_4px_0px_#000]">TECHNICAL INTERVIEWS.</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8 text-lg md:text-xl text-white max-w-2xl mx-auto bg-cyber-panel border-2 border-cyber-border p-4 shadow-[8px_8px_0px_#000] font-mono normal-case font-medium"
        >
          An AI-powered Dev Control Center that ingests your GitHub repositories, constructs deep knowledge graphs, and cures developer amnesia.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12 flex flex-col sm:flex-row items-center gap-6"
        >
          {session ? (
            <Link 
              href="/dashboard"
              className="px-8 py-4 bg-cyber-primary border-4 border-cyber-border shadow-[8px_8px_0px_#00E0FF] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[4px_4px_0px_#00E0FF] transition-all text-black text-xl flex items-center gap-2"
            >
              Enter Dashboard <ArrowRight className="w-6 h-6" />
            </Link>
          ) : (
            <button 
              onClick={() => signIn("github", { callbackUrl: '/dashboard' })}
              className="px-8 py-4 bg-cyber-primary border-4 border-cyber-border shadow-[8px_8px_0px_#00E0FF] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[4px_4px_0px_#00E0FF] transition-all text-black text-xl flex items-center gap-2"
            >
              <GithubIcon className="w-6 h-6" />
              Get Started Free
            </button>
          )}
        </motion.div>

        {/* Feature Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-32 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto px-4"
        >
          <FeatureCard 
            icon={<GitMerge className="w-8 h-8 text-cyber-cyan" />}
            title="Architectural Mapping"
            description="We build a local knowledge graph of your codebase so you understand how every file and service interacts."
          />
          <FeatureCard 
            icon={<Terminal className="w-8 h-8 text-cyber-primary" />}
            title="Interactive Walkthroughs"
            description="Ask the AI exactly what a complex utils file does and where it fits in the data flow."
          />
          <FeatureCard 
            icon={<MessageSquareCode className="w-8 h-8 text-white" />}
            title="The Grilling Mode"
            description="Our AI simulates a cynical Principal Engineer, poking holes in your security, scaling, and tech stack choices."
          />
        </motion.div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 bg-cyber-panel border-4 border-cyber-border shadow-[8px_8px_0px_#000] text-left hover:-translate-y-2 transition-transform">
      <div className="w-16 h-16 bg-cyber-canvas border-2 border-cyber-border flex items-center justify-center mb-6 shadow-[4px_4px_0px_#BD00FF]">
        {icon}
      </div>
      <h3 className="text-xl text-cyber-cyan mb-4">{title}</h3>
      <p className="text-white text-sm leading-relaxed normal-case">
        {description}
      </p>
    </div>
  );
}
