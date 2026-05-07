import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "~/env";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

export async function POST(req: Request) {
    try {
        const { question } = await req.json();

        // Dùng Flash cho tốc độ và hỗ trợ streaming
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const prompt = `
        Mày là hệ thống giải nghĩa kỹ thuật thực chiến. Tuyệt đối KHÔNG DÙNG Markdown.
        Nhiệm vụ: Trả lời mọi câu hỏi kỹ thuật theo ngôn ngữ dân IT, cực ngắn.
        Luật thép:
        1. CẤM TUYỆT ĐỐI mọi từ xưng hô, chào hỏi, cảm thán, hoặc từ đệm.
        2. BẮT BUỘC nhả thẳng vào kiến thức ngay từ chữ đầu tiên.
        3. Không định nghĩa Wikipedia. Chỉ giải thích bằng góc nhìn hành động.
        4. Tối đa 3 câu. 
        Câu hỏi: "${question}"
        `;

        const result = await model.generateContentStream(prompt);

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of result.stream) {
                        const chunkText = chunk.text();
                        if (chunkText) {
                            controller.enqueue(encoder.encode(chunkText));
                        }
                    }
                    controller.close();
                } catch (error) {
                    console.error("Streaming error:", error);
                    controller.error(error);
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Transfer-Encoding": "chunked",
            },
        });
    } catch (error) {
        console.error("Gemini API Error:", error);
        return Response.json({ error: "Lỗi kết nối API" }, { status: 500 });
    }
}
