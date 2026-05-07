"use client";

import { Send } from "lucide-react";
import { Input } from "~/components/ui/input";

interface ChatInputProps {
    input: string;
    setInput: (value: string) => void;
    sendMessage: (e: React.FormEvent) => void;
    isLoading: boolean;
}

export function ChatInput({ input, setInput, sendMessage, isLoading }: ChatInputProps) {
    return (
        <div className="border-t p-6 bg-muted/10">
            <div className="mx-auto max-w-3xl flex flex-col items-center gap-4">
                <form onSubmit={sendMessage} className="relative w-full flex items-center gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="pr-12 h-12 bg-background shadow-sm border-muted-foreground/20 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-muted-foreground/20"
                        disabled={isLoading}
                        placeholder="Nhập câu hỏi tại đây..."
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="absolute right-1.5 h-9 w-9 flex items-center justify-center rounded-md bg-primary text-primary-foreground transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                        <Send className="h-4 w-4" />
                        <span className="sr-only">Send message</span>
                    </button>
                </form>
            </div>
        </div>
    );
}
