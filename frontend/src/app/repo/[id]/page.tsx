"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Bot, Send, User, ChevronLeft, FileText, Code2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

// Dummy Cheat Sheet data since API is not fully hooked up with keys yet
const dummyCheatSheet = `
# Project Cheat Sheet: Ecommerce API

## 1. Tech Stack Justification
- **Node.js & Express**: Chosen for its event-driven, non-blocking I/O model, making it highly efficient for handling numerous concurrent API requests.
- **MongoDB**: A NoSQL database provides the flexibility needed for an evolving e-commerce schema (e.g., variable product attributes).

## 2. Data Flow Architecture
1. **Client Request**: Reaches the Express router.
2. **Middleware**: JWT authentication verifies the user.
3. **Controller**: Validates payload and triggers business logic.
4. **Service/Model Layer**: Interfaces with MongoDB via Mongoose.

## 3. Core Functionalities
- User Authentication (JWT)
- Product Catalog Management
- Shopping Cart & Checkout (Stripe Integration)
`;

export default function MockInterviewPage() {
  const params = useParams();
  const repoId = params?.id || "demo-id";
  
  const [messages, setMessages] = useState([
    { role: "AI", content: "I've reviewed your repository. Your choice of MongoDB for an e-commerce platform is interesting. E-commerce data is highly relational (Orders -> Users -> Products). Why didn't you use PostgreSQL?" }
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const newMessages = [...messages, { role: "USER", content: input }];
    setMessages(newMessages);
    setInput("");

    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: "AI", 
        content: "That's a valid point regarding schema flexibility for variable product attributes, but you lose ACID compliance across multiple documents out of the box. How are you handling transaction rollbacks if a payment succeeds but inventory deduction fails?" 
      }]);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 shrink-0 bg-neutral-900/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-colors text-neutral-400 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-indigo-400" />
            <h1 className="font-semibold tracking-tight">ecommerce-api</h1>
          </div>
        </div>
        <div className="text-sm px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full flex items-center gap-2 font-medium">
          <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          Grilling Mode Active
        </div>
      </header>

      {/* Main Split Layout */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Panel: Cheat Sheet */}
        <div className="w-full lg:w-1/2 border-r border-white/10 flex flex-col bg-neutral-950/50">
          <div className="p-4 border-b border-white/10 flex items-center gap-2 bg-neutral-900/30">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h2 className="font-semibold">AI Executive Summary</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-6 prose prose-invert prose-indigo max-w-none">
            {/* Simple Markdown Renderer simulation */}
            <div dangerouslySetInnerHTML={{ __html: dummyCheatSheet.replace(/\n/g, '<br/>').replace(/## (.*)/g, '<h2>$1</h2>').replace(/# (.*)/g, '<h1>$1</h1>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/- (.*)/g, '<li>$1</li>') }} />
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
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === "USER" ? "bg-indigo-500 text-white rounded-tr-sm" : "bg-white/5 border border-white/10 text-neutral-300 rounded-tl-sm"}`}>
                  {msg.content}
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
                placeholder="Defend your architectural choice..."
                className="w-full pl-4 pr-12 py-4 bg-neutral-950 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-neutral-600"
              />
              <button 
                type="submit"
                disabled={!input.trim()}
                className="absolute right-2 p-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>
      </main>
    </div>
  );
}
