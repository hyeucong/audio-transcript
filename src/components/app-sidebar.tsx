"use client";

import React, { useEffect, useState } from "react";
import {
    MessageSquare,
    Plus,
    Trash2,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "~/components/ui/sidebar";
import {
    getChatSessions,
    deleteChatSession,
    type ChatSession,
    generateFunnyTitle,
    saveChatSession,
} from "~/lib/chat-storage";
import { cn } from "~/lib/utils";

export function AppSidebar() {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const router = useRouter();
    const params = useParams();
    const currentId = params?.id as string;

    const loadSessions = () => {
        setSessions(getChatSessions());
    };

    useEffect(() => {
        loadSessions();
        window.addEventListener("storage_updated", loadSessions);
        return () => window.removeEventListener("storage_updated", loadSessions);
    }, []);

    const handleNewChat = () => {
        const recent = getChatSessions()[0];
        if (recent && recent.messages.length === 0) {
            router.push(`/chat/${recent.id}`);
            return;
        }

        const id = uuidv4();
        const title = generateFunnyTitle();
        saveChatSession({
            id,
            title,
            messages: [],
            createdAt: Date.now(),
        });
        router.push(`/chat/${id}`);
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        deleteChatSession(id);
        if (currentId === id) {
            router.push("/");
        }
    };

    return (
        <Sidebar variant="sidebar" collapsible="icon">
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    onClick={handleNewChat}
                                    tooltip="Chat mới"
                                    className="text-primary hover:text-primary hover:bg-primary/10"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>Chat mới</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>

                            {sessions.map((session) => (
                                <SidebarMenuItem key={session.id}>
                                    <SidebarMenuButton
                                        asChild
                                        tooltip={session.title}
                                        isActive={currentId === session.id}
                                        className={cn(
                                            "group/item transition-colors",
                                            currentId === session.id && "bg-muted font-medium"
                                        )}
                                    >
                                        <Link href={`/chat/${session.id}`} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <MessageSquare className="h-4 w-4 shrink-0" />
                                                <span className="truncate group-data-[collapsible=icon]:hidden">
                                                    {session.title}
                                                </span>
                                            </div>
                                            <button
                                                onClick={(e) => handleDelete(e, session.id)}
                                                className="ml-auto opacity-0 group-hover/item:opacity-100 p-1 hover:text-destructive transition-opacity group-data-[collapsible=icon]:hidden"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                {/* User profile or settings could go here */}
            </SidebarFooter>
        </Sidebar>
    );
}
