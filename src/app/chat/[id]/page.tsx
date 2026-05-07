"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { ChatInput } from "../../_components/chat-input";
import { useParams, useRouter } from "next/navigation";
import { getChatSession, saveChatSession, type Message } from "~/lib/chat-storage";

// Mức độ 1: Dùng React.memo để tối ưu 1000+ tin nhắn
const MessageBubble = React.memo(({ msg }: { msg: Message }) => {
    return (
        <div
            className={cn(
                "flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
        >
            <Card
                className={cn(
                    "relative px-4 py-3 shadow-sm max-w-[85%] border-none rounded-2xl",
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/50"
                )}
            >
                <div className="whitespace-pre-line text-sm leading-relaxed">
                    {msg.role === "ai" && msg.content === "" ? (
                        <div className="flex gap-1 py-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-gray-200 animate-pulse" />
                            <div className="h-1.5 w-1.5 rounded-full bg-gray-200 animate-pulse [animation-delay:0.2s]" />
                            <div className="h-1.5 w-1.5 rounded-full bg-gray-200 animate-pulse [animation-delay:0.4s]" />
                        </div>
                    ) : (
                        msg.content
                    )}
                </div>
            </Card>
        </div>
    );
});

MessageBubble.displayName = "MessageBubble";

export default function ChatPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [messages, setMessages] = useState<Message[]>([]);
    const [title, setTitle] = useState("");
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const lastLoadedId = useRef<string | null>(null);

    // Load chat on mount or id change
    useEffect(() => {
        const session = getChatSession(id);
        if (session) {
            setMessages(session.messages);
            setTitle(session.title);
        } else {
            // Reset if session not found (e.g. deleted or new)
            setMessages([]);
            setTitle("");
        }
        lastLoadedId.current = id;
    }, [id]);

    // Save chat when messages change
    useEffect(() => {
        // Only save if messages actually belong to the current ID to prevent duplication during navigation
        if (messages.length > 0 && lastLoadedId.current === id) {
            const currentSession = getChatSession(id);
            
            // Tránh lưu đè nếu dữ liệu không đổi (ngăn chặn loop event)
            if (currentSession && JSON.stringify(currentSession.messages) === JSON.stringify(messages)) {
                return;
            }

            saveChatSession({
                id,
                title: currentSession?.title || "New Chat",
                messages,
                createdAt: currentSession?.createdAt || Date.now(),
            });
        }
    }, [messages, id]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput("");

        setMessages((prev) => [
            ...prev,
            { role: "user", content: userMessage },
            { role: "ai", content: "" },
        ]);
        setIsLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: userMessage }),
            });

            if (!res.ok) throw new Error("Network response was not ok");
            if (!res.body) throw new Error("No response body");

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                accumulatedContent += chunk;

                setMessages((prev) => {
                    const newMessages = [...prev];
                    const lastIndex = newMessages.length - 1;
                    const lastMessage = newMessages[lastIndex];
                    if (lastMessage && lastMessage.role === "ai") {
                        newMessages[lastIndex] = { ...lastMessage, content: accumulatedContent };
                    }
                    return newMessages;
                });
            }
        } catch (error) {
            console.error("Lỗi:", error);
            setMessages((prev) => {
                const newMessages = [...prev];
                const lastIndex = newMessages.length - 1;
                const lastMessage = newMessages[lastIndex];
                if (lastMessage && lastMessage.role === "ai" && lastMessage.content === "") {
                    newMessages[lastIndex] = { ...lastMessage, content: "Đã xảy ra lỗi khi kết nối với máy chủ." };
                }
                return newMessages;
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                <div className="mx-auto max-w-3xl space-y-6">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <MessageBubble key={idx} msg={msg} />
                    ))}

                    <div ref={messagesEndRef} className="h-px" />
                </div>
            </div>

            <ChatInput
                input={input}
                setInput={setInput}
                sendMessage={sendMessage}
                isLoading={isLoading}
            />
        </div>
    );
}
