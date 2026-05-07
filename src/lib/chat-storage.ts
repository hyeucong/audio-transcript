export interface Message {
    role: "user" | "ai";
    content: string;
}

export interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    createdAt: number;
}

const ADJECTIVES = ["Aggressive", "Sleepy", "Dancing", "Purple", "Spicy", "Swift", "Quiet", "Grumpy", "Fancy", "Digital"];
const NOUNS = ["Cucumber", "Toaster", "Penguin", "Developer", "Rocket", "Banana", "Wizard", "Ninja", "Cactus", "Laptop"];

export function generateFunnyTitle() {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num = Math.floor(Math.random() * 1000);
    return `${adj}${noun}${num}`;
}

const STORAGE_KEY = "chat_sessions";

export function getChatSessions(): ChatSession[] {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    try {
        return JSON.parse(saved);
    } catch (e) {
        console.error("Failed to parse chat sessions", e);
        return [];
    }
}

export function saveChatSession(session: ChatSession) {
    const sessions = getChatSessions();
    const index = sessions.findIndex((s) => s.id === session.id);
    if (index > -1) {
        sessions[index] = session;
    } else {
        sessions.unshift(session);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    // Trigger a storage event for other components to listen to
    window.dispatchEvent(new Event("storage_updated"));
}

export function getChatSession(id: string): ChatSession | undefined {
    return getChatSessions().find((s) => s.id === id);
}

export function getMostRecentSession(): ChatSession | undefined {
    const sessions = getChatSessions();
    return sessions[0];
}

export function deleteChatSession(id: string) {
    const sessions = getChatSessions().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    window.dispatchEvent(new Event("storage_updated"));
}
