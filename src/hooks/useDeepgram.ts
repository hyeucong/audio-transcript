import { useState, useRef, useCallback, useEffect } from "react";

interface UseDeepgramOptions {
    onFinal?: (text: string) => void;
    language?: string;
    /** Extra tech keywords to boost (e.g. ["Kubernetes", "GraphQL"]). Deepgram will bias toward these when audio sounds similar. */
    keywords?: string[];
}

export function useDeepgram(options: UseDeepgramOptions = {}) {
    const { onFinal, language = "vi", keywords = [] } = options;

    // ── Rendered state (for UI) ───────────────────────────────────────────────
    const [isCallActive, setIsCallActive] = useState(false); // screen audio captured
    const [isTranscribing, setIsTranscribing] = useState(false); // WS + recorder running
    const [liveTranscript, setLiveTranscript] = useState("");

    // ── Internal refs (read inside stable callbacks) ──────────────────────────
    const audioStreamRef = useRef<MediaStream | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const accumulatedRef = useRef(""); // only is_final sentences
    const latestTextRef = useRef(""); // latest text including interim
    const isTranscribingRef = useRef(false);
    const onFinalRef = useRef(onFinal);

    useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);

    // ── Stable helper: tear down WS + recorder ────────────────────────────────
    const cleanupTranscription = useCallback((fire: boolean) => {
        const rec = mediaRecorderRef.current;
        if (rec && rec.state !== "inactive") rec.stop();
        mediaRecorderRef.current = null;

        const ws = socketRef.current;
        if (ws && ws.readyState !== WebSocket.CLOSED) ws.close();
        socketRef.current = null;

        isTranscribingRef.current = false;
        setIsTranscribing(false);

        console.log("[Deepgram] cleanup | fire:", fire, "| accumulated:", JSON.stringify(accumulatedRef.current), "| latest:", JSON.stringify(latestTextRef.current));

        if (fire) {
            // Prefer committed is_final text; fallback to latest interim
            const text = accumulatedRef.current.trim() || latestTextRef.current.trim();
            console.log("[Deepgram] cleanup | text to fire:", JSON.stringify(text));
            if (text) onFinalRef.current?.(text);
            else console.warn("[Deepgram] cleanup | no text — Deepgram returned nothing");
        }

        accumulatedRef.current = "";
        latestTextRef.current = "";
        setLiveTranscript("");
    }, []); // truly stable — reads everything through refs

    // ── startCall: open screen-share popup, grab system audio ─────────────────
    const startCall = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
            });

            const audioTrack = stream.getAudioTracks()[0];
            if (!audioTrack) {
                alert('Please tick "Share system audio / Tab audio" in the popup!');
                stream.getTracks().forEach((t) => t.stop());
                return;
            }

            // Drop video — we only need audio
            stream.getVideoTracks().forEach((t) => t.stop());
            audioStreamRef.current = new MediaStream([audioTrack]);

            // If the user clicks "Stop sharing" in the browser chrome, end the call
            audioTrack.addEventListener("ended", () => {
                cleanupTranscription(false);
                audioStreamRef.current?.getTracks().forEach((t) => t.stop());
                audioStreamRef.current = null;
                setIsCallActive(false);
            });

            setIsCallActive(true);
        } catch (err) {
            console.error("[Deepgram] startCall:", err);
        }
    }, [cleanupTranscription]); // stable

    // ── stopCall: end everything ───────────────────────────────────────────────
    const stopCall = useCallback(() => {
        cleanupTranscription(false);
        audioStreamRef.current?.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
        setIsCallActive(false);
    }, [cleanupTranscription]); // stable

    // ── startTranscribe: open WS + start MediaRecorder ────────────────────────
    const startTranscribe = useCallback(() => {
        if (!audioStreamRef.current || isTranscribingRef.current) return;

        accumulatedRef.current = "";
        latestTextRef.current = "";
        setLiveTranscript("");

        const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
        if (!apiKey) { alert("NEXT_PUBLIC_DEEPGRAM_API_KEY not set!"); return; }

        // Build keyword boost params (each keyword gets a :5 boost weight)
        const keywordParams = keywords
            .map((k) => `keywords=${encodeURIComponent(k)}:5`)
            .join("&");

        const wsUrl = [
            `wss://api.deepgram.com/v1/listen`,
            `?model=nova-2`,
            `&language=${language}`,
            `&smart_format=true`,
            `&interim_results=true`,
            keywordParams ? `&${keywordParams}` : "",
        ].join("");

        const ws = new WebSocket(wsUrl, ["token", apiKey]);
        socketRef.current = ws;

        ws.onopen = () => {
            isTranscribingRef.current = true;
            setIsTranscribing(true);

            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus"
                : MediaRecorder.isTypeSupported("audio/webm")
                    ? "audio/webm"
                    : "audio/ogg;codecs=opus";

            const rec = new MediaRecorder(audioStreamRef.current!, { mimeType });
            mediaRecorderRef.current = rec;

            rec.addEventListener("dataavailable", (e) => {
                if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(e.data);
            });
            rec.start(250);
        };

        ws.onmessage = (msg) => {
            try {
                const data = JSON.parse(msg.data as string);
                const text: string = data?.channel?.alternatives?.[0]?.transcript ?? "";
                if (!text) return;

                if (data.is_final) {
                    if (text.trim()) {
                        accumulatedRef.current += (accumulatedRef.current ? " " : "") + text.trim();
                    }
                    latestTextRef.current = accumulatedRef.current;
                    setLiveTranscript(accumulatedRef.current);
                } else {
                    const preview = (accumulatedRef.current ? accumulatedRef.current + " " : "") + text;
                    latestTextRef.current = preview;
                    setLiveTranscript(preview);
                }
            } catch { /* ignore */ }
        };

        ws.onerror = (e) => console.error("[Deepgram] WS error:", e);
        ws.onclose = () => {
            isTranscribingRef.current = false;
            setIsTranscribing(false);
        };
    }, [language]); // stable while language is constant

    // ── stopTranscribe: stop WS + recorder, fire onFinal → triggers AI send ───
    const stopTranscribe = useCallback(() => {
        cleanupTranscription(true);
    }, [cleanupTranscription]); // stable

    return {
        isCallActive,
        isTranscribing,
        liveTranscript,
        startCall,
        stopCall,
        startTranscribe,
        stopTranscribe,
    };
}
