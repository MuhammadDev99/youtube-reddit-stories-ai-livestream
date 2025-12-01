export interface Story {
    title: string;
    description: string;
    id: string
}
export interface DialogueLine {
    speaker: 'man' | 'woman';
    text: string;
}

export interface GeneratedStory {
    original: Story;
    content: string;
    dialogue: DialogueLine[];
}
