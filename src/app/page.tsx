"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { generateFunnyTitle, saveChatSession, getMostRecentSession } from "~/lib/chat-storage";

export default function HomePage() {
    const router = useRouter();

    const redirected = useRef(false);

    useEffect(() => {
        if (redirected.current) return;
        redirected.current = true;

        const recent = getMostRecentSession();
        
        // Nếu phiên gần nhất đang trống, dùng luôn nó thay vì tạo cái mới
        if (recent && recent.messages.length === 0) {
            router.replace(`/chat/${recent.id}`);
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
        router.replace(`/chat/${id}`);
    }, [router]);

    return (
        <div className="flex h-screen items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
    );
}
