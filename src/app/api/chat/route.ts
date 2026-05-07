import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "~/env";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

export async function POST(req: Request) {
    try {
        const { question } = await req.json();

        // Dùng Flash cho tốc độ và hỗ trợ streaming
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const prompt = `
        Ngữ cảnh: Câu trả lời phỏng vấn. KHÔNG DÙNG Markdown.
        Luật thép:
        1. Cấm nhận mình là AI hay hệ thống.
        2. Đi thẳng vào vấn đề: Nó là gì?
        3. Vào thẳng vấn đề ngay từ chữ đầu tiên.
        4. Đóng vai trò là ứng viên được phỏng vấn cho vị trí kỹ sư phần mềm.
        5. Câu trả lời ngắn gọn khoảng 2-3 câu.
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
