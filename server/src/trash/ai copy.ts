import OpenAI from 'openai';
import dotenv from 'dotenv';
import { NvidiaModelId } from './ai-models.js'
dotenv.config({ quiet: true });

const openai = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: 'https://integrate.api.nvidia.com/v1',
});
export async function askNvidiaAI(model: NvidiaModelId, prompt: string, onToken: (token: string) => void, isThinking: boolean = true, systemPrompt: string = "", maxTokens: number = 8192, temperature: number = 0.7, getReasoningTokens: boolean = false): Promise<string> {
    const messages = []
    let chat_template_kwargs = {}
    if (isThinking) {
        chat_template_kwargs = { "thinking": true }
    }
    if (systemPrompt.length > 0) {
        messages.push({ "role": "system", "content": systemPrompt })
    }
    if (prompt.length > 0) {
        messages.push({ "role": "user", "content": prompt })
    }

    const completion = await openai.chat.completions.create({
        model,
        messages,
        temperature,
        top_p: 0.7,
        max_tokens: maxTokens,
        chat_template_kwargs,
        stream: true
    } as any) as any;
    let fullResponse = ""
    for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta as any;
        const reasoning = delta.reasoning_content;
        const content = delta.content;

        if (reasoning && getReasoningTokens) {
            onToken(reasoning)
            fullResponse += reasoning
        }

        if (content) {
            onToken(content)
            fullResponse += content
        }
    }
    return fullResponse
}
