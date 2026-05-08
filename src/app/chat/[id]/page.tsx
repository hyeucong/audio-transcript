"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { ChatInput } from "../../_components/chat-input";
import { useParams } from "next/navigation";
import { getChatSession, saveChatSession, type Message } from "~/lib/chat-storage";
import { useDeepgram } from "~/hooks/useDeepgram";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { Mic, Phone, PictureInPicture2 } from "lucide-react";

// ─── Message bubble ────────────────────────────────────────────────────────────
const MessageBubble = React.memo(({ msg }: { msg: Message }) => (
    <div className={cn(
        "flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
        msg.role === "user" ? "flex-row-reverse" : "flex-row"
    )}>
        <Card className={cn(
            "w-full px-4 py-3 shadow-sm border-none rounded-2xl",
            msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/50"
        )}>
            <div className="whitespace-pre-line text-sm leading-relaxed">
                {msg.role === "ai" && msg.content === "" ? (
                    <div className="flex gap-1 py-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-pulse" />
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-pulse [animation-delay:0.2s]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-pulse [animation-delay:0.4s]" />
                    </div>
                ) : msg.content}
            </div>
        </Card>
    </div>
));
MessageBubble.displayName = "MessageBubble";

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ChatPage() {
    const params   = useParams();
    const id       = params.id as string;

    const [messages, setMessages] = useState<Message[]>([]);
    const [title, setTitle]       = useState("");
    const [input, setInput]       = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef  = useRef<HTMLDivElement>(null);
    const lastLoadedId    = useRef<string | null>(null);

    // Ref to the latest sendMessageText — lets the stable onFinal callback call it
    const sendRef = useRef<(text: string) => Promise<void>>(async () => {});
    // isLoading in a ref so the stable onFinal callback reads current value
    const isLoadingRef = useRef(false);
    // PiP
    const [isPip, setIsPip] = useState(false);
    const pipWrapperRef    = useRef<HTMLDivElement>(null); // stable restore target
    const chatContainerRef = useRef<HTMLDivElement>(null); // div that gets teleported
    const pipWindowRef     = useRef<Window | null>(null);

    const {
        isCallActive,
        isTranscribing,
        liveTranscript,
        startCall,
        stopCall,
        startTranscribe,
        stopTranscribe,
    } = useDeepgram({
        onFinal: (text) => {
            console.log("[onFinal] received text:", JSON.stringify(text));
            console.log("[onFinal] isLoadingRef.current:", isLoadingRef.current);
            if (!text.trim()) {
                console.warn("[onFinal] empty transcript — nothing transcribed");
                return;
            }
            void sendRef.current(text);
        },
        language: "vi",
        keywords: [
            // Frontend
            "React", "Next.js", "Vue", "Angular", "TypeScript", "JavaScript",
            "Redux", "Zustand", "Tailwind", "Webpack", "Vite", "GraphQL",
            "useState", "useEffect", "useCallback", "useMemo", "useRef",
            "lifecycle", "component", "hook", "props", "state", "render",
            "Virtual DOM", "hydration", "SSR", "SSG", "CSR",
            // Backend
            "Node.js", "Express", "NestJS", "FastAPI", "Django", "Spring Boot",
            "REST", "API", "WebSocket", "gRPC", "microservice",
            "authentication", "authorization", "JWT", "OAuth",
            // Database
            "PostgreSQL", "MySQL", "MongoDB", "Redis", "Prisma", "Drizzle",
            "ORM", "indexing", "transaction", "migration",
            // DevOps / Infra
            "Docker", "Kubernetes", "CI/CD", "GitHub Actions", "Nginx",
            "AWS", "GCP", "Azure", "S3", "Lambda", "EC2",
            // Concepts
            "SOLID", "Design Pattern", "MVC", "DDD", "Clean Architecture",
            "Big O", "algorithm", "data structure", "cache", "queue",
            "load balancer", "scalability", "concurrency", "async", "await",
        ],
    });

    // Refs so the single-registered keydown handler always reads current state
    const isCallActiveRef   = useRef(false);
    const isTranscribingRef = useRef(false);
    useEffect(() => { isCallActiveRef.current   = isCallActive;   }, [isCallActive]);
    useEffect(() => { isTranscribingRef.current = isTranscribing; }, [isTranscribing]);

    // ── Load session ───────────────────────────────────────────────────────────
    useEffect(() => {
        const session = getChatSession(id);
        if (session) { setMessages(session.messages); setTitle(session.title); }
        else         { setMessages([]); setTitle(""); }
        lastLoadedId.current = id;
    }, [id]);

    // ── Persist session ────────────────────────────────────────────────────────
    useEffect(() => {
        if (messages.length > 0 && lastLoadedId.current === id) {
            const cur = getChatSession(id);
            if (cur && JSON.stringify(cur.messages) === JSON.stringify(messages)) return;
            saveChatSession({
                id,
                title: cur?.title || "New Chat",
                messages,
                createdAt: cur?.createdAt || Date.now(),
            });
        }
    }, [messages, id]);

    // ── Auto-scroll ────────────────────────────────────────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }, [messages, isPip]);

    // ── ~ key: toggle transcription (only when call is active) ─────────────────
    // Registered once — startTranscribe and stopTranscribe are stable callbacks.
    // Uses refs to avoid any stale closure on isCallActive / isTranscribing.
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "`") return;
            if (!isCallActiveRef.current) return; // call not active → do nothing
            e.preventDefault();
            if (isTranscribingRef.current) {
                stopTranscribe(); // stop + fire onFinal → AI call
            } else {
                startTranscribe(); // start recording
            }
        };

        window.addEventListener("keydown", onKeyDown);
        const pipWin = pipWindowRef.current;
        if (pipWin) {
            pipWin.addEventListener("keydown", onKeyDown as EventListener);
        }

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            if (pipWin) {
                pipWin.removeEventListener("keydown", onKeyDown as EventListener);
            }
        };
    }, [startTranscribe, stopTranscribe, isPip]); // re-bind when PiP window opens/closes

    // ── Send message to Gemini ─────────────────────────────────────────────────
    const sendMessageText = async (text: string) => {
        console.log("[sendMessageText] called with:", JSON.stringify(text), "isLoading:", isLoadingRef.current);
        if (!text.trim() || isLoadingRef.current) {
            console.warn("[sendMessageText] skipped — empty or loading");
            return;
        }

        setInput("");
        setMessages((prev) => [
            ...prev,
            { role: "user", content: text },
            { role: "ai",   content: "" },
        ]);
        isLoadingRef.current = true;
        setIsLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ question: text }),
            });
            if (!res.ok || !res.body) throw new Error("Bad response");

            const reader  = res.body.getReader();
            const decoder = new TextDecoder();
            let accumulated = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                accumulated += decoder.decode(value, { stream: true });
                setMessages((prev) => {
                    const next = [...prev];
                    const last = next[next.length - 1];
                    if (last?.role === "ai") next[next.length - 1] = { ...last, content: accumulated };
                    return next;
                });
            }
        } catch (err) {
            console.error("API Error:", err);
            setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "ai" && last.content === "")
                    next[next.length - 1] = { ...last, content: "Connection error. Please try again." };
                return next;
            });
        } finally {
            isLoadingRef.current = false;
            setIsLoading(false);
        }
    };

    // Keep refs in sync every render
    sendRef.current = sendMessageText;

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        void sendMessageText(input.trim());
    };

    // ── Document Picture-in-Picture ────────────────────────────────────────────
    const togglePip = async () => {
        // Close if already open
        if (pipWindowRef.current) {
            pipWindowRef.current.close();
            return;
        }

        const dPiP = (window as unknown as { documentPictureInPicture?: { requestWindow(o: { width: number; height: number }): Promise<Window> } }).documentPictureInPicture;
        if (!dPiP) { alert("Document PiP not supported (Chrome 116+ required)"); return; }

        const pipWin = await dPiP.requestWindow({ width: 420, height: 400 });
        pipWindowRef.current = pipWin;

        // ── 1. Copy all stylesheets so Tailwind classes work in PiP ──
        [...document.styleSheets].forEach((sheet) => {
            try {
                const cssText = [...sheet.cssRules].map((r) => r.cssText).join("");
                const style = pipWin.document.createElement("style");
                style.textContent = cssText;
                pipWin.document.head.appendChild(style);
            } catch {
                // Cross-origin sheet — link it by href instead
                if (sheet.href) {
                    const link = pipWin.document.createElement("link");
                    link.rel = "stylesheet";
                    link.href = sheet.href;
                    pipWin.document.head.appendChild(link);
                }
            }
        });

        // ── 2. Match dark mode + reset body ──
        pipWin.document.documentElement.className = document.documentElement.className;
        pipWin.document.body.style.cssText = "margin:0;padding:0;overflow:hidden;height:100dvh";

        // ── 3. Teleport the chat container into PiP ──
        if (chatContainerRef.current) {
            pipWin.document.body.appendChild(chatContainerRef.current);
        }

        setIsPip(true);

        // ── 4. Restore when PiP closes ──
        pipWin.addEventListener("pagehide", () => {
            if (chatContainerRef.current && pipWrapperRef.current) {
                pipWrapperRef.current.appendChild(chatContainerRef.current);
            }
            pipWindowRef.current = null;
            setIsPip(false);
        });
    };

    return (
        <div ref={pipWrapperRef} className="h-full">
        <div ref={chatContainerRef} className="flex h-full flex-col bg-background text-foreground overflow-hidden">

            {/* ── Header ── */}
            <header className="sticky top-0 z-10 shrink-0 flex h-10 items-center gap-2 border-b px-3 bg-background">
                <SidebarTrigger className="-ml-1" />
                <div className="flex-1" />

                {/* Mic / Phone status */}
                {isCallActive && (
                    <div className="flex items-center gap-1.5">
                        {isTranscribing ? (
                            <span title="Recording — press ~ to stop">
                                <Mic className="h-4 w-4 text-red-500 animate-pulse" />
                            </span>
                        ) : (
                            <span title="Call active — press ~ to record">
                                <Phone className="h-4 w-4 text-green-500" />
                            </span>
                        )}
                    </div>
                )}

                {/* PiP toggle */}
                {!isPip && (
                    <button
                        onClick={() => void togglePip()}
                        title="Pop out to floating window"
                        className="ml-1 h-7 w-7 flex items-center justify-center rounded-md transition-all hover:scale-110 active:scale-95 text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                        <PictureInPicture2 className="h-4 w-4" />
                    </button>
                )}
            </header>

            {/* ── Message list ── */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-3xl space-y-6">

                    {messages.map((msg, idx) => (
                        <MessageBubble key={idx} msg={msg} />
                    ))}

                    {/* Live transcript preview bubble */}
                    {isTranscribing && liveTranscript && (
                        <div className="flex flex-row-reverse gap-4 opacity-70">
                            <Card className="w-full px-4 py-3 border border-dashed border-red-400/60 rounded-2xl bg-red-500/5">
                                <p className="text-sm leading-relaxed italic text-red-300">
                                    {liveTranscript}
                                </p>
                            </Card>
                        </div>
                    )}

                    <div ref={messagesEndRef} className="h-px" />
                </div>
            </div>

            {/* ── Chat input ── */}
            {!isPip && (
                <ChatInput
                    input={input}
                    setInput={setInput}
                    sendMessage={sendMessage}
                    isLoading={isLoading}
                    isCallActive={isCallActive}
                    isTranscribing={isTranscribing}
                    onStartCall={startCall}
                    onStopCall={stopCall}
                />
            )}
        </div>
        </div>
    );
}
