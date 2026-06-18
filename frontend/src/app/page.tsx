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

  // Optionally auto-redirect if logged in, or just show Dashboard button
  // We will show the Dashboard button so they can still see the landing page if they want.

  return (
    <div className="relative min-h-screen bg-neutral-950 text-neutral-50 overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] bg-gradient-to-br from-indigo-500/20 to-purple-600/10 blur-[120px] rounded-full opacity-50 pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <MessageSquareCode className="w-8 h-8 text-indigo-400" />
          <span className="text-xl font-bold tracking-tight">RepoWhisper</span>
        </div>
        
        {status === "loading" ? (
          <div className="h-10 w-32 bg-white/5 animate-pulse rounded-lg" />
        ) : session ? (
          <div className="flex items-center gap-4">
            <Link href="/profile" className="text-sm font-medium text-neutral-300 hover:text-white transition-colors hidden sm:block">
              Profile
            </Link>
            <Link href="/dashboard" className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 transition-colors rounded-lg font-medium text-sm flex items-center gap-2 text-white">
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <button 
            onClick={() => signIn("github", { callbackUrl: '/dashboard' })}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 transition-colors rounded-lg font-medium text-sm flex items-center gap-2"
          >
            <GithubIcon className="w-4 h-4" />
            Sign in with GitHub
          </button>
        )}
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center pt-32 pb-20 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 text-sm font-medium mb-8 border border-indigo-500/20"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          Cure Developer Amnesia
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tight max-w-4xl mx-auto leading-tight"
        >
          Defend your code in <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            technical interviews.
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8 text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto"
        >
          An AI-powered project intelligence platform that ingests your GitHub repositories, maps your architecture, and grills you in mock interviews.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4"
        >
          {session ? (
            <Link 
              href="/dashboard"
              className="px-8 py-4 bg-indigo-500 hover:bg-indigo-600 transition-colors rounded-xl font-medium text-white flex items-center gap-2 shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)]"
            >
              Enter Dashboard <ArrowRight className="w-5 h-5" />
            </Link>
          ) : (
            <button 
              onClick={() => signIn("github", { callbackUrl: '/dashboard' })}
              className="px-8 py-4 bg-indigo-500 hover:bg-indigo-600 transition-colors rounded-xl font-medium text-white flex items-center gap-2 shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)]"
            >
              <GithubIcon className="w-5 h-5" />
              Get Started Free
            </button>
          )}
        </motion.div>

        {/* Feature Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-32 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto px-4"
        >
          <FeatureCard 
            icon={<GitMerge className="w-6 h-6 text-indigo-400" />}
            title="Architectural Mapping"
            description="We build a local knowledge graph of your codebase so you understand how every file and service interacts."
          />
          <FeatureCard 
            icon={<Terminal className="w-6 h-6 text-purple-400" />}
            title="Interactive Walkthroughs"
            description="Ask the AI exactly what a complex utils file does and where it fits in the data flow."
          />
          <FeatureCard 
            icon={<MessageSquareCode className="w-6 h-6 text-rose-400" />}
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
    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left backdrop-blur-sm">
      <div className="w-12 h-12 rounded-xl bg-neutral-900 flex items-center justify-center mb-4 border border-white/5">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-neutral-400 leading-relaxed text-sm">
        {description}
      </p>
    </div>
  );
}
