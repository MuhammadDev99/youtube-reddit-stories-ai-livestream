import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

dotenv.config({ quiet: true });
const app = express();
const PORT = 3001;

// --- PATHS ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, '../public');
const PIPER_DIR = path.join(process.cwd(), '../piper');
// NOTE: Put your .json stories in server/stories/
const STORIES_DIR = path.join(__dirname, '../stories');

fs.ensureDirSync(PUBLIC_DIR);

app.use(cors());
app.use(express.static(PUBLIC_DIR));

// --- TYPES ---
interface Chunk {
    text: string;
    speaker: "MALE" | "FEMALE";
    audioUrl: string;
    imageUrl: string; // Optional: Remove if you don't want images
}

const queue: Chunk[] = [];
let isGenerating = false;

const client = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: 'https://integrate.api.nvidia.com/v1'
});

// --- GENERATOR ---
async function generateAudio(text: string, speaker: "MALE" | "FEMALE") {
    const filename = `${uuidv4()}.wav`;
    const model = speaker === 'FEMALE' ? 'female.onnx' : 'male.onnx';

    return new Promise<string>((resolve, reject) => {
        const proc = spawn(path.join(PIPER_DIR, 'piper.exe'), [
            '--model', path.join(PIPER_DIR, model),
            '--output_file', path.join(PUBLIC_DIR, filename)
        ]);
        proc.stdin.write(text);
        proc.stdin.end();
        proc.on('close', () => resolve(filename));
        proc.on('error', reject);
    });
}

async function loop() {
    if (isGenerating || queue.length > 5) {
        setTimeout(loop, 2000);
        return;
    }
    isGenerating = true;

    try {
        // 1. Load random story
        const files = fs.readdirSync(STORIES_DIR).filter(f => f.endsWith('.json'));
        if (!files.length) throw new Error("No stories found");
        const story = fs.readJsonSync(path.join(STORIES_DIR, files[Math.floor(Math.random() * files.length)]));

        // 2. AI Request
        const stream = await client.chat.completions.create({
            model: "deepseek-ai/deepseek-v3.1",
            messages: [
                { role: "system", content: "Output strictly: 'Male: [Text]' or 'Female: [Text]'" },
                { role: "user", content: `Context: ${story.description}. Write a dialogue.` }
            ],
            stream: true
        });

        let buffer = "";
        for await (const chunk of stream) {
            buffer += chunk.choices[0]?.delta?.content || "";
            if (buffer.includes("\n")) {
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    const match = line.match(/^(Male|Female):\s*(.*)/i);
                    if (match) {
                        const speaker = match[1].toUpperCase() as "MALE" | "FEMALE";
                        const text = match[2].trim();
                        if (!text) continue;

                        const file = await generateAudio(text, speaker);
                        const img = `https://image.pollinations.ai/prompt/${encodeURIComponent(text)}?nologo=true`;

                        queue.push({
                            text,
                            speaker,
                            audioUrl: `http://localhost:${PORT}/${file}`,
                            imageUrl: img
                        });
                        console.log(`[Generated] ${speaker}: ${text}`);
                    }
                }
            }
        }
    } catch (e) {
        console.error(e);
    }

    isGenerating = false;
    setTimeout(loop, 1000);
}

loop();

app.get('/next', (req, res) => res.json(queue.shift() || null));
app.listen(PORT, () => console.log(`Backend on ${PORT}`));