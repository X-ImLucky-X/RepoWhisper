"use client";

import { motion } from "framer-motion";
import { ChevronLeft, LogOut, User as UserIcon } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "unauthenticated") {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <header className="h-16 border-b border-white/10 flex items-center px-6 shrink-0 bg-neutral-900/50 backdrop-blur-md">
        <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-neutral-400 hover:text-white flex items-center gap-2">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Go Back</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md p-8 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-16 bg-indigo-500/10 blur-3xl rounded-full" />
          
          <div className="w-24 h-24 rounded-full bg-neutral-800 border-4 border-neutral-900 flex items-center justify-center mb-6 overflow-hidden relative z-10">
            {session?.user?.image ? (
              <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-10 h-10 text-neutral-500" />
            )}
          </div>
          
          <h1 className="text-2xl font-bold mb-1 relative z-10">{session?.user?.name || "Developer"}</h1>
          <p className="text-neutral-400 mb-8 relative z-10">{session?.user?.email || "GitHub User"}</p>
          
          <button 
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 transition-colors rounded-xl font-medium flex items-center justify-center gap-2 relative z-10"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </motion.div>
      </main>
    </div>
  );
}
