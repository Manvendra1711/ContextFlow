"use client";

import { useSearchParams, useRouter } from "next/navigation";
import React, { Suspense, useState, useEffect, useRef, useMemo } from "react";
import { MessageSquare, X, Maximize, Minimize, Network, Copy, Check, Square } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code", err);
    }
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/90 text-slate-300 text-xs font-mono border-b border-slate-700/60">
        <span className="font-semibold uppercase tracking-wider text-slate-400">
          {language || "code"}
        </span>
        <button
          onClick={onCopy}
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer select-none"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={14} className="text-emerald-400" />
              <span className="text-emerald-400 font-medium text-xs">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span className="text-xs">Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-sm font-mono text-slate-100 leading-relaxed">
        <pre className="!m-0 !p-0 bg-transparent">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

function highlightTree(children, branches, onOpenThread) {
  if (!branches || branches.length === 0) return children;

  return React.Children.map(children, (child) => {
    if (typeof child === "string") {
      let elements = [child];
      branches.forEach((branch, bIdx) => {
        const next = [];
        elements.forEach((el) => {
          if (typeof el === "string" && el.includes(branch.branchedText)) {
            const parts = el.split(branch.branchedText);
            parts.forEach((p, pIdx) => {
              if (p) next.push(p);
              if (pIdx < parts.length - 1) {
                next.push(
                  <span
                    key={`${branch.id}-${bIdx}-${pIdx}`}
                    className="bg-amber-200 dark:bg-amber-700/60 text-slate-900 dark:text-amber-100 cursor-pointer hover:bg-amber-300 dark:hover:bg-amber-600 px-1 py-0.5 rounded font-medium transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenThread(branch.id);
                    }}
                    title="Click to open this branched thread"
                  >
                    {branch.branchedText}
                  </span>
                );
              }
            });
          } else {
            next.push(el);
          }
        });
        elements = next;
      });
      return elements;
    }
    if (React.isValidElement(child) && child.props && child.props.children) {
      return React.cloneElement(child, {
        children: highlightTree(child.props.children, branches, onOpenThread),
      });
    }
    return child;
  });
}

const FormattedMessage = React.memo(function FormattedMessage({
  content,
  messageId,
  threads = [],
  onOpenThread,
}) {
  const branches = useMemo(() => {
    const b = threads.filter((t) => t.branchMessageId === messageId && t.branchedText);
    b.sort((a, b) => b.branchedText.length - a.branchedText.length);
    return b;
  }, [threads, messageId]);

  const components = useMemo(
    () => ({
      h1: ({ children }) => (
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-6 mb-3 pb-1 border-b border-slate-200 dark:border-slate-800 first:mt-0">
          {highlightTree(children, branches, onOpenThread)}
        </h1>
      ),
      h2: ({ children }) => (
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-5 mb-2.5 first:mt-0">
          {highlightTree(children, branches, onOpenThread)}
        </h2>
      ),
      h3: ({ children }) => (
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mt-4 mb-2 first:mt-0">
          {highlightTree(children, branches, onOpenThread)}
        </h3>
      ),
      h4: ({ children }) => (
        <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100 mt-3 mb-1 first:mt-0">
          {highlightTree(children, branches, onOpenThread)}
        </h4>
      ),
      p: ({ children }) => (
        <p className="mb-3 last:mb-0 leading-relaxed text-slate-800 dark:text-slate-200">
          {highlightTree(children, branches, onOpenThread)}
        </p>
      ),
      ul: ({ children }) => (
        <ul className="my-2.5 ml-5 list-disc space-y-1.5 marker:text-slate-400">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className="my-2.5 ml-5 list-decimal space-y-1.5 marker:text-slate-500 marker:font-semibold">
          {children}
        </ol>
      ),
      li: ({ children }) => (
        <li className="leading-relaxed pl-1 text-slate-800 dark:text-slate-200">
          {highlightTree(children, branches, onOpenThread)}
        </li>
      ),
      strong: ({ children }) => (
        <strong className="font-semibold text-slate-900 dark:text-white">
          {highlightTree(children, branches, onOpenThread)}
        </strong>
      ),
      em: ({ children }) => (
        <em className="italic">
          {highlightTree(children, branches, onOpenThread)}
        </em>
      ),
      blockquote: ({ children }) => (
        <blockquote className="border-l-4 border-blue-500/80 pl-4 py-1.5 my-3 italic text-slate-600 dark:text-slate-400 bg-blue-50/50 dark:bg-blue-950/20 rounded-r-lg">
          {highlightTree(children, branches, onOpenThread)}
        </blockquote>
      ),
      a: ({ href, children }) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-2 transition-colors"
        >
          {highlightTree(children, branches, onOpenThread)}
        </a>
      ),
      table: ({ children }) => (
        <div className="overflow-x-auto my-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            {children}
          </table>
        </div>
      ),
      thead: ({ children }) => (
        <thead className="bg-slate-100 dark:bg-slate-800/80 font-semibold text-slate-800 dark:text-slate-200">
          {children}
        </thead>
      ),
      th: ({ children }) => (
        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {children}
        </th>
      ),
      td: ({ children }) => (
        <td className="px-4 py-2 text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-slate-800">
          {highlightTree(children, branches, onOpenThread)}
        </td>
      ),
      hr: () => <hr className="my-6 border-slate-200 dark:border-slate-800" />,
      code({ node, inline, className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || "");
        const codeString = String(children).replace(/\n$/, "");
        const isInline = inline || (!match && !codeString.includes("\n"));

        if (isInline) {
          return (
            <code
              className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-pink-600 dark:text-pink-400 font-mono text-[0.875em] font-medium border border-slate-300/40 dark:border-slate-700"
              {...props}
            >
              {children}
            </code>
          );
        }

        return <CodeBlock language={match ? match[1] : ""} code={codeString} />;
      },
    }),
    [branches, onOpenThread]
  );

  return (
    <div className="text-slate-800 dark:text-slate-200 text-sm md:text-base leading-relaxed break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
});

function SelectableMessage({ m, onBranch, threads = [], onOpenThread }) {
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

      const text = selection.toString().trim();
      if (!text) {
        setSelectionRect(null);
        return;
      }

      const isInside =
        containerRef.current &&
        (containerRef.current.contains(selection.anchorNode) ||
          containerRef.current.contains(selection.focusNode));

      if (isInside) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectedText(selection.toString());
        setSelectionRect(rect);
      } else {
        setSelectionRect(null);
      }
    };

    const handleMouseDown = (e) => {
      if (selectionRect && !e.target.closest(".branch-btn")) {
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

  const messageText = useMemo(() => {
    return m.parts
      ? m.parts.filter((p) => p.type === "text").map((p) => p.text).join("")
      : m.content || "";
  }, [m.parts, m.content]);

  const messageBody = useMemo(() => {
    if (m.role === "assistant") {
      return (
        <FormattedMessage
          content={messageText}
          messageId={m.id}
          threads={threads}
          onOpenThread={onOpenThread}
        />
      );
    }
    return (
      <p className="whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200">
        {messageText}
      </p>
    );
  }, [m.role, messageText, m.id, threads, onOpenThread]);

  return (
    <div className="flex gap-4 relative">
      <div
        className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
          m.role === "user"
            ? "bg-blue-200 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200"
            : "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
        }`}
      >
        {m.role === "user" ? "U" : "AI"}
      </div>
      <div className="flex-1 space-y-2 min-w-0">
        <p className="font-medium text-slate-800 dark:text-white">
          {m.role === "user" ? "You" : "Assistant"}
        </p>
        <div ref={containerRef} className="text-slate-800 dark:text-slate-200">
          {messageBody}
        </div>
      </div>

      {selectionRect && m.role === "assistant" && (
        <div
          className="fixed z-50 branch-btn"
          style={{
            top: selectionRect.top - 40,
            left: selectionRect.left + selectionRect.width / 2 - 60,
          }}
        >
          <button
            onClick={() => {
              onBranch(selectedText, m.id);
              setSelectionRect(null);
              window.getSelection()?.removeAllRanges();
            }}
            className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md shadow-lg hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
          >
            ↳ Create Thread
          </button>
        </div>
      )}
    </div>
  );
}

function ChatThread({ id, title, isNested, closeSidebar, threads = [], onOpenThread }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const parentThreadId = isNested ? searchParams.get("parentThreadId") : null;
  const branchMessageId = isNested ? searchParams.get("branchMessageId") : null;
  const branchedText = isNested ? searchParams.get("branchedText") : null;

  const { messages, status, sendMessage, error, stop } = useChat({
    id: id,
    api: "/api/chat",
    body: {
      threadId: id,
      parentThreadId,
      branchMessageId,
      branchedText,
    },
  });

  const isLoading = status === "submitted" || status === "streaming";
  const [localInput, setLocalInput] = useState("");

  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status]);

  const onSubmit = (e) => {
    e.preventDefault();
    if (!localInput || !localInput.trim()) return;

    const textToSend = localInput;
    setLocalInput("");

    sendMessage({ text: textToSend });
  };

  const handleBranch = async (selectedText, messageId) => {
    const newThreadId = Math.random().toString(36).substring(7);

    try {
      await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newThreadId,
          parentThreadId: id,
          branchMessageId: messageId,
          branchedText: selectedText,
        }),
      });
    } catch (err) {
      console.error("Failed to register thread", err);
    }

    router.push(
      `/?threadId=${newThreadId}&parentThreadId=${id}&branchMessageId=${messageId}&branchedText=${encodeURIComponent(
        selectedText
      )}`
    );
  };

  return (
    <div className="flex flex-col flex-1 h-full w-full min-h-0 overflow-hidden">
      <main ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 p-6 relative">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          {messages.length === 0 && (
            <div className="text-center text-slate-500 mt-10">
              {isNested ? "Start this thread..." : "Welcome to ContextFlow! Ask a question to begin."}
            </div>
          )}

          {isNested && branchedText && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg mb-4">
              <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold mb-1 uppercase tracking-wider">
                Context
              </p>
              <p className="text-slate-700 dark:text-slate-300 text-sm italic">
                "{branchedText}"
              </p>
            </div>
          )}

          {messages.map((m) => (
            <SelectableMessage
              key={m.id}
              m={m}
              onBranch={handleBranch}
              threads={threads}
              onOpenThread={onOpenThread}
            />
          ))}

          {isLoading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0 flex items-center justify-center text-xs font-bold text-slate-800 dark:text-slate-200">
                AI
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-800 dark:text-white">Assistant</p>
                <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-sm">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  <span>Generating response...</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium">
              {error.message || "An error occurred while communicating with the AI."}
            </div>
          )}
        </div>
      </main>

      <div className="p-4 shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
        <form onSubmit={onSubmit} className="max-w-3xl mx-auto flex gap-2">
          <input
            type="text"
            value={localInput}
            onChange={(e) => setLocalInput(e.target.value)}
            placeholder={isNested ? "Reply to thread..." : "Message AI..."}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white shadow-sm"
          />
          {isLoading && (
            <button
              type="button"
              onClick={stop}
              className="px-4 py-3 bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 rounded-xl font-medium hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors shrink-0 shadow-sm cursor-pointer flex items-center justify-center"
              title="Stop generating"
            >
              <Square size={20} className="fill-current" />
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || !localInput || !localInput.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 shadow-sm cursor-pointer"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

function ThreadMapModal({ isOpen, onClose, onSelectThread, threads = [] }) {
  if (!isOpen) return null;

  const buildTree = (threadsData) => {
    const root = { id: "main", children: [] };
    const threadMap = { main: root };

    threadsData.forEach((t) => {
      if (t.id !== "main") {
        threadMap[t.id] = { ...t, children: [] };
      }
    });

    threadsData.forEach((t) => {
      if (t.id !== "main") {
        const parentId = t.parentThreadId || "main";
        if (threadMap[parentId]) {
          threadMap[parentId].children.push(threadMap[t.id]);
        } else {
          root.children.push(threadMap[t.id]);
        }
      }
    });

    return root;
  };

  const tree = buildTree(threads);

  const TreeNode = ({ node }) => (
    <div className="ml-4 border-l-2 border-slate-200 dark:border-slate-700 pl-4 py-1">
      <div
        className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-md transition-colors"
        onClick={() => {
          onSelectThread(node.id);
          onClose();
        }}
      >
        <Network size={16} className="text-slate-500" />
        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
          {node.id === "main" ? "Main Chat" : `Thread: ${node.id}`}
        </span>
      </div>
      {node.children &&
        node.children.map((child) => <TreeNode key={child.id} node={child} />)}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-[600px] max-h-[80vh] flex flex-col border border-slate-200 dark:border-slate-800">
        <header className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <Network size={20} className="text-blue-500" />
            Visual Thread Map
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-500 cursor-pointer"
          >
            <X size={20} />
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="-ml-4">
            <TreeNode node={tree} />
          </div>
        </main>
      </div>
    </div>
  );
}

function ChatLayout() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeThreadId = searchParams.get("threadId");

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [threads, setThreads] = useState([]);

  // Lock window scroll position so that browser input focus or viewport shifts never move the layout
  useEffect(() => {
    const lockScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener("scroll", lockScroll, { passive: true });
    return () => window.removeEventListener("scroll", lockScroll);
  }, []);

  const fetchThreads = () => {
    fetch("/api/threads")
      .then((res) => res.json())
      .then((data) => setThreads(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchThreads();
  }, [activeThreadId]);

  const handleOpenThread = (id) => {
    if (id === "main") {
      router.push("/");
    } else {
      router.push(`/?threadId=${id}`);
    }
  };

  const closeSidebar = () => {
    router.push("/");
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="fixed inset-0 h-full w-full flex bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-16 shrink-0 h-full border-r border-slate-200 dark:border-slate-800 flex flex-col items-center py-4 bg-white dark:bg-slate-900 z-20 gap-4">
        <button
          onClick={() => router.push("/")}
          className="p-3 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 hover:opacity-80 transition-opacity cursor-pointer"
          title="Main Chat"
        >
          <MessageSquare size={24} />
        </button>
        <button
          onClick={() => setIsMapOpen(true)}
          className="p-3 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Thread Map"
        >
          <Network size={24} />
        </button>
      </div>

      {/* Main Chat Area */}
      <div
        className={`flex flex-col flex-1 h-full min-h-0 min-w-0 overflow-hidden transition-all duration-300 ${
          isFullscreen ? "hidden" : "flex"
        }`}
      >
        <header className="h-14 shrink-0 border-b border-slate-200 dark:border-slate-800 flex items-center px-6 bg-white dark:bg-slate-900 z-10">
          <h1 className="font-semibold text-lg text-slate-800 dark:text-white">Main Chat</h1>
        </header>
        <ChatThread
          id="main"
          title="Main Chat"
          isNested={false}
          threads={threads}
          onOpenThread={handleOpenThread}
        />
      </div>

      {/* Nested Thread Sidebar */}
      {activeThreadId && (
        <div
          className={`border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full min-h-0 overflow-hidden transition-all duration-300 shadow-2xl z-20 ${
            isFullscreen ? "fixed inset-0 ml-16" : "w-[500px] shrink-0"
          }`}
        >
          <header className="h-14 shrink-0 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 z-10">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span
                className="cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                onClick={closeSidebar}
              >
                Main Chat
              </span>
              <span>/</span>
              <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-[300px]">
                Thread: {activeThreadId}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-500 transition-colors cursor-pointer"
              >
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
              <button
                onClick={closeSidebar}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-500 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </header>

          <ChatThread
            id={activeThreadId}
            title={`Thread: ${activeThreadId}`}
            isNested={true}
            closeSidebar={closeSidebar}
            threads={threads}
            onOpenThread={handleOpenThread}
          />
        </div>
      )}

      <ThreadMapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onSelectThread={handleOpenThread}
        threads={threads}
      />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          Loading ContextFlow...
        </div>
      }
    >
      <ChatLayout />
    </Suspense>
  );
}
