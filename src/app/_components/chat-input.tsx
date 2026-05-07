"use client";

import { Send, PhoneCall, PhoneOff } from "lucide-react";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

interface ChatInputProps {
    input: string;
    setInput: (value: string) => void;
    sendMessage: (e: React.FormEvent) => void;
    isLoading: boolean;
    isCallActive: boolean;
    isTranscribing: boolean;
    onStartCall: () => void;
    onStopCall: () => void;
}

export function ChatInput({
    input,
    setInput,
    sendMessage,
    isLoading,
    isCallActive,
    isTranscribing,
    onStartCall,
    onStopCall,
}: ChatInputProps) {
    return (
        <div className="shrink-0 border-t p-4 bg-muted/10">
            <div className="mx-auto max-w-3xl">
                <form onSubmit={sendMessage} className="relative flex items-center gap-2">

                    {/* Call toggle button */}
                    <button
                        type="button"
                        onClick={isCallActive ? onStopCall : onStartCall}
                        title={isCallActive ? "End call" : "Start call (captures system audio)"}
                        className={cn(
                            "shrink-0 h-10 w-10 flex items-center justify-center rounded-full border transition-all duration-200",
                            isCallActive
                                ? "bg-red-500/15 border-red-500/40 text-red-400 hover:bg-red-500/25 hover:scale-105 active:scale-95"
                                : "bg-muted border-muted-foreground/20 text-muted-foreground hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/30 hover:scale-105 active:scale-95"
                        )}
                    >
                        {isCallActive
                            ? <PhoneOff className="h-4 w-4" />
                            : <PhoneCall className="h-4 w-4" />
                        }
                    </button>

                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="pr-12 h-12 bg-background shadow-sm border-muted-foreground/20 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-muted-foreground/20"
                        disabled={isLoading}
                    />

                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="absolute right-1.5 h-9 w-9 flex items-center justify-center rounded-md bg-primary text-primary-foreground transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                        <Send className="h-4 w-4" />
                        <span className="sr-only">Send</span>
                    </button>
                </form>
            </div>
        </div>
    );
}
