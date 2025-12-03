import dotenv from 'dotenv';
// Load env immediately
import path from 'path';
const __DIRNAME = import.meta.dirname;
dotenv.config({ path: path.resolve(__DIRNAME, '../../.env') });

import express, { Request, Response } from 'express';
import cors from 'cors';
import { generateStory } from './utils/index.js';
import { GeneratedStory } from './common/types.js';
import { GENERATED_STORIES_DIR, FRESH_STORIES_AMOUNT } from './config/consts.js';

// We only need one main cache array
const freshStories: GeneratedStory[] = [];
let isGeneratingStory = false;

async function ensureFreshStories() {
    // If we have room for more stories AND we aren't currently making one
    if (freshStories.length < FRESH_STORIES_AMOUNT && !isGeneratingStory) {
        isGeneratingStory = true; // LOCK
        console.log("Refilling stories...");
        try {
            const freshStory = await generateStory();
            freshStories.push(freshStory);
            console.log(`Story generated. Cache size: ${freshStories.length}`);
        } catch (error) {
            console.error("Error in background generation:", error);
        } finally {
            isGeneratingStory = false; // UNLOCK
        }
    }
}

async function main() {
    console.log("Initializing... Generating first story...");
    try {
        const generatedStory = await generateStory();
        freshStories.push(generatedStory);
        console.log(`\nInitialization complete. Cache ready.`);
    } catch (e) {
        console.error("Failed to generate initial story:", e);
    }

    // Check for new stories every 5 seconds
    setInterval(ensureFreshStories, 5000);
}

// Start the background generation
main();

const app = express();
app.use(cors());
app.use('/stories', express.static(GENERATED_STORIES_DIR));

const port = Number(process.env.PORT) || 4000;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

app.get("/story", async (req: Request, res: Response) => {
    try {
        // Handle empty cache case
        if (freshStories.length === 0) {
            console.log("Cache empty! Generating story on-demand...");
            const emergencyStory = await generateStory();
            freshStories.push(emergencyStory);
        }

        ensureFreshStories();

        const story = freshStories.shift();

        if (!story) {
            return res.status(503).json({ error: "No stories available yet. Please try again in a moment." });
        }

        const protocol = req.protocol;
        const host = req.get('host');
        const baseUrl = `${protocol}://${host}`;
        const storyId = story.original.id;
        const storyResourcePath = `${baseUrl}/stories/${storyId}`;

        const dialogueWithAudio = story.dialogue.map((line, idx) => {
            return {
                ...line,
                audioUrl: `${storyResourcePath}/${idx}.wav`
            };
        });
        story.dialogue = dialogueWithAudio;
        return res.json(story);

    } catch (error: any) {
        console.error("Error serving story:", error);
        res.status(500).json({ error: "Failed to generate story", details: error.message });
    }
});