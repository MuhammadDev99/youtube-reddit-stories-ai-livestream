import path from "path";
import { DialogueLine, GeneratedStory, PiperModel, Story } from "../common/types.js";
import { ttsPiper } from "../services/ai/tts.js";
import { GENERATED_STORIES_DIR, STORIES_DIR, STORY_SYSTEM_PROMPT } from "../config/consts.js";
import fs, { access, constants } from 'fs';
import fsp, { readFile, mkdir } from 'fs/promises';
import { safe, checkFileExists, ensureDirectory, getWavCount, readAndParseJson } from "../utils/index.js";
import { askNvidiaAI, nvidiaModels } from "../services/ai/index.js";

export function parseDialogue(input: string): DialogueLine[] {
    const dialogueLines: DialogueLine[] = [];
    const regex = /(Man|Woman):\s*([\s\S]+?)(?=\s*(?:Man|Woman):|$)/gi;

    let match;
    while ((match = regex.exec(input)) !== null) {
        const speakerStr = match[1].toLowerCase();

        if (speakerStr === 'man' || speakerStr === 'woman') {
            const text = match[2].trim();

            if (text.length > 0) {
                dialogueLines.push({
                    speaker: speakerStr,
                    text,
                });
            }
        }
    }

    return dialogueLines;
}

export async function generateStoryAudio({
    story,
    outputDir
}: { story: GeneratedStory; outputDir: string }) {
    const wavFilesCount = await getWavCount(outputDir)
    if (wavFilesCount === story.dialogue.length) {
        return
    }
    for (let i = 0; i < story.dialogue.length; i++) {
        const dialogueLine: DialogueLine = story.dialogue[i]
        const outputTts = path.resolve(outputDir, `${i}.wav`)
        await ttsPiper({ text: dialogueLine.text, outputPath: outputTts, model: dialogueLine.speaker as PiperModel })
    }
}


const storyFileNames = fs.readdirSync(STORIES_DIR).filter(x => x.endsWith(".json"))
const stories: Story[] = []
for (let i = 0; i < storyFileNames.length; i++) {
    const storyPath = path.resolve(STORIES_DIR, storyFileNames[i])
    try {
        const fileContent = fs.readFileSync(storyPath, 'utf-8');
        const story = JSON.parse(fileContent) as Story;
        stories.push(story)
    } catch (e) {
        console.log(`Error loading ${storyPath}, Error: ${e}`)
    }
}
if (stories.length === 0) {
    throw new Error("No stories found.")
}


let lastStoryIndex = 0;
function getNextStory(): Story {
    const targetIndex = lastStoryIndex;
    lastStoryIndex++;
    if (lastStoryIndex >= stories.length) {
        lastStoryIndex = 0;
    }
    return stories[targetIndex]
}



export async function generateStory(): Promise<GeneratedStory> {
    const story = getNextStory();
    const outputDir = path.resolve(GENERATED_STORIES_DIR, story.id)
    const outputPath = path.resolve(outputDir, story.id + ".json")
    await ensureDirectory(path.dirname(outputPath))
    const outputExists = await checkFileExists(outputPath)

    // If it already exists on disk, load it, generate missing audio, and return it
    if (outputExists) {
        const generatedStoryResult = await safe(readAndParseJson<GeneratedStory>(outputPath))
        if (generatedStoryResult.success) {
            console.log(`Story ${story.id} already exists on disk. Loading...`);
            await generateStoryAudio({ story: generatedStoryResult.data, outputDir })
            return generatedStoryResult.data
        }
    }

    const userPrompt = `
Here is the story to convert:
**Title:** ${story.title}
**Context:** ${story.description}

**Instructions:**
1. Start the conversation in the middle of the action (e.g., "I can't believe he actually said that").
2. Make sure the 'Listener' points out the contradiction (e.g., asking if he wanted kids originally).
3. End with the Speaker's final resolve or emotional state.
`;

    console.log(`Generating Script for: ${story.title}...\n`);

    const result = await safe(askNvidiaAI({
        model: nvidiaModels.deepseek_v3_1,
        prompt: userPrompt,
        systemPrompt: STORY_SYSTEM_PROMPT,
        isThinking: false,
        onToken: (token) => process.stdout.write(token)
    }));


    if (!result.success) {
        console.error("\n\n❌ AI Generation Failed:", result.error.message);
        throw result.error
    }

    const generatedStory: GeneratedStory = {
        original: story,
        content: result.data,
        dialogue: parseDialogue(result.data)
    }

    await fsp.writeFile(outputPath, JSON.stringify(generatedStory, null, 2))
    await generateStoryAudio({ story: generatedStory, outputDir })

    return generatedStory
}
