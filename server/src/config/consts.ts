import path, { resolve } from "path";
export const API_BASE = 'http://localhost:4000'
export const __DIRNAME = import.meta.dirname
export const STORIES_DIR = resolve(__DIRNAME, '../../stories');
export const GENERATED_STORIES_DIR = resolve(__DIRNAME, '../../public/generated-stories')

export const PIPER_EXECUTABLE_PATH = path.resolve(__DIRNAME, '../../../piper/piper.exe');
console.log(PIPER_EXECUTABLE_PATH)
export const PIPER_MODELS_PATH = path.resolve(path.dirname(PIPER_EXECUTABLE_PATH), 'models');

export const STORY_SYSTEM_PROMPT = `
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
`