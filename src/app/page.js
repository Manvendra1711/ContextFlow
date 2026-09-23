"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect, useRef } from "react";
import { MessageSquare, X, Maximize, Minimize } from "lucide-react";

import { useChat } from "@ai-sdk/react";

function SelectableMessage({ m, onBranch }) {
  const [selectionRect, setSelectionRect] = useState(null);
  const [selectedText, setSelectedText] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setSelectionRect(null);
        return;
      }
      
      if (containerRef.current && containerRef.current.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectedText(selection.toString());
        setSelectionRect(rect);
      } else {
        setSelectionRect(null);
      }
    };

    const handleMouseDown = (e) => {
      if (selectionRect && !e.target.closest('.branch-btn')) {
         setSelectionRect(null);
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);
    
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [selectionRect]);

  const messageText = m.parts 
    ? m.parts.filter(p => p.type === 'text').map(p => p.text).join('') 
    : m.content || '';

  return (
    <div className="flex gap-4 relative">
      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
        m.role === 'user' ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-800'
      }`}>
        {m.role === 'user' ? 'U' : 'AI'}
      </div>
      <div className="flex-1 space-y-2">
        <p className="font-medium text-slate-800 dark:text-white">
          {m.role === 'user' ? 'You' : 'Assistant'}
        </p>
        <div ref={containerRef} className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
          {messageText}
        </div>
      </div>

      {selectionRect && m.role === 'assistant' && (
        <div 
          className="fixed z-50 branch-btn" 
          style={{ 
            top: selectionRect.top - 40, 
            left: selectionRect.left + (selectionRect.width / 2) - 60 
          }}
        >
          <button 
            onClick={() => {
                onBranch(selectedText, m.id);
                setSelectionRect(null);
                window.getSelection()?.removeAllRanges();
            }}
            className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md shadow-lg hover:bg-slate-800 flex items-center gap-1"
          >
            ↳ Create Thread
          </button>
        </div>
      )}
    </div>
  );
}

function ChatThread({ id, title, isNested, closeSidebar }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const parentThreadId = isNested ? searchParams.get('parentThreadId') : null;
  const branchMessageId = isNested ? searchParams.get('branchMessageId') : null;
  const branchedText = isNested ? searchParams.get('branchedText') : null;
  
  const { messages, status, sendMessage, error } = useChat({
    id: id,
    api: '/api/chat',
    body: {
      threadId: id,
      parentThreadId,
      branchMessageId,
      branchedText
    }
  });

  const isLoading = status === 'submitted' || status === 'streaming';
  const [localInput, setLocalInput] = useState("");

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const onSubmit = (e) => {
    e.preventDefault();
    if (!localInput || !localInput.trim()) return;
    
    const textToSend = localInput;
    setLocalInput("");
    
    sendMessage({ text: textToSend });
  };

  const handleBranch = (selectedText, messageId) => {
    const newThreadId = Math.random().toString(36).substring(7);
    router.push(`/?threadId=${newThreadId}&parentThreadId=${id}&branchMessageId=${messageId}&branchedText=${encodeURIComponent(selectedText)}`);
  };

  return (
    <div className="flex flex-col h-full w-full">
      <main className="flex-1 overflow-y-auto p-6 relative">
         <div className="max-w-3xl mx-auto flex flex-col gap-6">
            
            {messages.length === 0 && (
              <div className="text-center text-slate-500 mt-10">
                {isNested ? "Start this thread..." : "Welcome to ContextFlow! Ask a question to begin."}
              </div>
            )}

            {messages.map((m) => (
              <SelectableMessage key={m.id} m={m} onBranch={handleBranch} />
            ))}
            
            {isLoading && (
              <div className="flex gap-4">
                 <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 flex items-center justify-center text-xs font-bold text-slate-800">
                  AI
                 </div>
                 <div className="flex-1">
                   <p className="font-medium text-slate-800 dark:text-white">Assistant</p>
                   <p className="text-slate-500">Thinking...</p>
                 </div>
              </div>
            )}
            
            {error && (
              <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium">
                {error.message || "An error occurred while communicating with the AI."}
              </div>
            )}
            <div ref={messagesEndRef} />
         </div>
      </main>
      
      <div className="p-4 shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <form onSubmit={onSubmit} className="max-w-3xl mx-auto flex gap-2">
          <input 
            type="text" 
            value={localInput}
            onChange={(e) => setLocalInput(e.target.value)}
            placeholder={isNested ? "Reply to thread..." : "Message AI..."}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white shadow-sm"
          />
          <button 
            type="submit" 
            disabled={isLoading || !localInput || !localInput.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

function ChatLayout() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeThreadId = searchParams.get("threadId");
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const closeSidebar = () => {
    router.push("/");
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      
      {/* Sidebar Navigation */}
      <div className="w-16 shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center py-4 bg-white dark:bg-slate-900 z-10">
        <button className="p-3 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 hover:opacity-80 transition-opacity">
          <MessageSquare size={24} />
        </button>
      </div>

      {/* Main Chat Area */}
      <div className={`flex flex-col flex-1 transition-all duration-300 ${isFullscreen ? 'hidden' : 'flex'}`}>
        <header className="h-14 shrink-0 border-b border-slate-200 dark:border-slate-800 flex items-center px-6 bg-white dark:bg-slate-900">
          <h1 className="font-semibold text-lg text-slate-800 dark:text-white">Main Chat</h1>
        </header>
        <ChatThread id="main" title="Main Chat" isNested={false} />
      </div>

      {/* Nested Thread Sidebar */}
      {activeThreadId && (
        <div className={`border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col transition-all duration-300 shadow-2xl z-20
          ${isFullscreen ? 'fixed inset-0 ml-16' : 'w-[500px] shrink-0'}`}
        >
          <header className="h-14 shrink-0 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4">
             <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="cursor-pointer hover:text-slate-800 transition-colors" onClick={closeSidebar}>Main Chat</span>
                <span>/</span>
                <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-[300px]">
                  Thread: {activeThreadId}
                </span>
             </div>
             <div className="flex items-center gap-1">
                <button onClick={toggleFullscreen} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-500 transition-colors">
                   {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>
                <button onClick={closeSidebar} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-500 transition-colors">
                   <X size={18} />
                </button>
             </div>
          </header>
          
          <ChatThread id={activeThreadId} title={`Thread: ${activeThreadId}`} isNested={true} closeSidebar={closeSidebar} />
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading ContextFlow...</div>}>
      <ChatLayout />
    </Suspense>
  );
}
