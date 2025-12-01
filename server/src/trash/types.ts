export interface StoryChunk {
    id: string;
    text: string;
    speaker: "MALE" | "FEMALE" | "SYSTEM";
    audioUrl: string;
    image: string | null;
    title: string;
}