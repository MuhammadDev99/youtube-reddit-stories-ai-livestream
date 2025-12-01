import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import cors from 'cors'; // <--- IMPORT THIS
import { generateStory } from './utils/index.js';
import { GeneratedStory } from './common/types.js';
import { GENERATED_STORIES_DIR } from './config/consts.js';

dotenv.config({ quiet: true });

const generatedStoriesCache: GeneratedStory[] = [];

// Initialize server and pre-load one story
async function main() {
    console.log("Initializing... Generating first story for cache index 0");
    try {
        const generatedStory = await generateStory();
        generatedStoriesCache.push(generatedStory);
        console.log(`\nInitialization complete. Cache ready.`);
    } catch (e) {
        console.error("Failed to generate initial story:", e);
    }
}

// Start the background generation
main();

const app = express();

// 1. ENABLE CORS (Crucial for React to connect)
app.use(cors());

// 2. Serve Static Files
app.use('/stories', express.static(GENERATED_STORIES_DIR));

const port = Number(process.env.PORT) || 4000;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

app.get("/story", async (req: Request, res: Response) => {
    try {
        const indexParam = req.query.index;
        let requestedIndex = typeof indexParam === 'string' ? parseInt(indexParam, 10) : -1;
        let story: GeneratedStory;
        let servingIndex: number;

        if (!isNaN(requestedIndex) && requestedIndex >= 0 && requestedIndex < generatedStoriesCache.length) {
            console.log(`Serving cached story at index ${requestedIndex}`);
            story = generatedStoriesCache[requestedIndex];
            servingIndex = requestedIndex;
        } else {
            console.log("Index not found or not provided. Generating new story...");
            story = await generateStory();
            generatedStoriesCache.push(story);
            servingIndex = generatedStoriesCache.length - 1;
        }

        const protocol = req.protocol;
        const host = req.get('host');
        const baseUrl = `${protocol}://${host}`;
        const storyId = story.original.id;
        const storyResourcePath = `${baseUrl}/stories/${storyId}`;

        // Enrich the dialogue with full audio URLs
        const dialogueWithAudio = story.dialogue.map((line, idx) => {
            return {
                ...line,
                audioUrl: `${storyResourcePath}/${idx}.wav`
            };
        });

        return res.json({
            index: servingIndex,
            story: {
                ...story,
                dialogue: dialogueWithAudio,
                files: {
                    json: `${storyResourcePath}/${storyId}.json`,
                    base_url: storyResourcePath
                }
            }
        });

    } catch (error: any) {
        console.error("Error serving story:", error);
        res.status(500).json({ error: "Failed to generate story", details: error.message });
    }
});