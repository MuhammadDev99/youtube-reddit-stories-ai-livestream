import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config({ quiet: true });

const openai = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: 'https://integrate.api.nvidia.com/v1',
});

async function getFirstStory() {
    try {
        // Define path to stories folder
        const storiesDir = path.join(process.cwd(), 'stories');

        // Read directory
        const files = await fs.readdir(storiesDir);

        // Find first json file
        const jsonFile = files[1]

        if (!jsonFile) {
            throw new Error("No JSON files found in the 'stories' folder.");
        }

        console.log(`\nReading story from: ${jsonFile}\n`);

        // Read and parse file
        const filePath = path.join(storiesDir, jsonFile);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(fileContent);

    } catch (error) {
        console.error("Error reading story:", error);
        process.exit(1);
    }
}

async function main() {
    // 1. Get the story data
    const story = await getFirstStory();

    // 2. Prepare the prompt
    const systemPrompt = `
You are a scriptwriter converting a Reddit story into a realistic, overheard dialogue between two close friends (a Male and a Female).

**Role Assignment:**
1. Analyze the story to determine the author's gender.
   - If Author is **Female**: She is the Main Speaker. The Male is the Listener.
   - If Author is **Male**: He is the Main Speaker. The Female is the Listener.

**Style Guidelines:**
- **Tone:** Casual, emotional, and raw. This is a "venting session" over coffee or drinks.
- **Pacing:** Do not rush. Let the details come out naturally through questions.
- **The Listener:** Must be active. They should interrupt, ask clarifying questions (e.g., "Wait, didn't he say...?"), and react with genuine shock or anger.
- **The Speaker:** Should sound emotional (angry, sad, or incredulous). Use natural speech patterns (brief pauses, "I mean," "Honestly," etc.).
- **Content:** Include specific details from the text (ages, specific quotes like "reset button", specific actions like "hugging the luggage").

**Format:**
Man: [Text]
Woman: [Text]
`;

    const userPrompt = `
Here is the story to convert:
**Title:** ${story.title}
**Context:** ${story.description}

**Instructions:**
1. Start the conversation in the middle of the action (e.g., "I can't believe he actually said that").
2. Make sure the 'Listener' points out the contradiction (e.g., asking if he wanted kids originally).
3. End with the Speaker's final resolve or emotional state.
`;
    // 3. Call the API
    const completion = await openai.chat.completions.create({
        model: "deepseek-ai/deepseek-v3.1",
        messages: [
            { "role": "system", "content": systemPrompt },
            { "role": "user", "content": userPrompt }
        ],
        temperature: 0.6, // Increased slightly for better creativity in dialogue
        top_p: 0.7,
        max_tokens: 8192,
        chat_template_kwargs: { "thinking": true }, // Keeping your specific config
        stream: true
    } as any) as any;

    // 4. Stream the output
    console.log("--- Generating Conversation ---\n");

    for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta as any;
        const reasoning = delta.reasoning_content;
        const content = delta.content;

        // Print reasoning (thinking process) if available, usually in gray or distinct way
        if (reasoning) {
            process.stdout.write(`\x1b[90m${reasoning}\x1b[0m`);
        }

        // Print actual content
        if (content) {
            process.stdout.write(content);
        }
    }
    console.log("\n\n--- End of Conversation ---");
}

main();