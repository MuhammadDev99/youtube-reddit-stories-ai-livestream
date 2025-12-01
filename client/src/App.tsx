import { useState, useRef, useEffect } from 'react';
import './App.css';

// --- Types (Inline for simplicity) ---
interface DialogueLine {
    speaker: string;
    text: string;
    audioUrl: string;
}

interface StoryResponse {
    story: {
        original: { title: string; author: string };
        dialogue: DialogueLine[];
    };
}

const API_URL = 'http://localhost:4000';

function App() {
    const [data, setData] = useState<StoryResponse | null>(null);
    const [currentIndex, setCurrentIndex] = useState<number>(-1);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // 1. Fetch Story on Load
    useEffect(() => {
        fetchNewStory();
    }, []);

    const fetchNewStory = async () => {
        stopAudio();
        setData(null); // Clear screen
        try {
            const res = await fetch(`${API_URL}/story`);
            const json = await res.json();
            console.log(json)
            setData(json);
        } catch (e) {
            console.error(e);
        }
    };

    // 2. Playback Logic (Recursive)
    const playSequence = (index: number) => {
        if (!data) return;

        // Check if story is finished
        if (index >= data.story.dialogue.length) {
            setCurrentIndex(-1); // Reset or handle "Done" state
            return;
        }

        // A. Update UI immediately
        setCurrentIndex(index);

        // B. Setup Audio
        const line = data.story.dialogue[index];
        if (audioRef.current) audioRef.current.pause(); // Safety stop

        const audio = new Audio(line.audioUrl);
        audioRef.current = audio;

        // C. When audio ends -> Play next index
        audio.onended = () => {
            playSequence(index + 1);
        };

        // D. Play
        audio.play().catch(e => console.error("Audio Error:", e));
    };

    const stopAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setCurrentIndex(-1);
    };

    // --- RENDER ---

    if (!data) return <div className="screen">Loading...</div>;

    const currentLine = currentIndex >= 0 ? data.story.dialogue[currentIndex] : null;

    return (
        <div className="screen">
            {/* 1. Header Area */}
            <div className="header">
                <h2>{data.story.original.title}</h2>
                <p>u/{data.story.original.author}</p>
            </div>

            {/* 2. Subtitle Area */}
            <div className="content">
                {currentLine ? (
                    <div className="subtitle-box">
                        <h3 style={{ color: currentLine.speaker.includes('Man') ? '#90cdf4' : '#f687b3' }}>
                            {currentLine.speaker}
                        </h3>
                        <h1>{currentLine.text}</h1>
                    </div>
                ) : (
                    /* Start Button */
                    <div className="start-menu">
                        <button onClick={() => playSequence(0)}>START STORY</button>
                        <button onClick={fetchNewStory}>GET NEW STORY</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;