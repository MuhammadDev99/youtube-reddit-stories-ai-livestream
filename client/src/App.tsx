import { useState, useRef, useEffect } from 'react';
import './App.css';
import type { GeneratedStory } from './common/types';
import { getStory, safe } from './utils';

// Configuration
const STORY_COOLDOWN_MS = 6000;
let globalStoryIndex = 0;

// Helper: Typewriter Effect
const Typewriter = ({ text, speed = 25 }: { text: string, speed?: number }) => {
    const [display, setDisplay] = useState('');
    useEffect(() => {
        setDisplay('');
        let i = 0;
        // Basic animation loop
        const timer = setInterval(() => {
            if (i < text.length) {
                setDisplay(prev => prev + text.charAt(i));
                i++;
            } else {
                clearInterval(timer);
            }
        }, speed);
        return () => clearInterval(timer);
    }, [text, speed]);
    return <span>{display}</span>;
};

function App() {
    const [started, setStarted] = useState(false);

    // We keep 'currentStory' for what is visually on screen
    // 'status' dictates what the engine is doing
    const [currentStory, setCurrentStory] = useState<GeneratedStory | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'PLAYING' | 'WAITING'>('IDLE');

    // Playback state
    const [lineIndex, setLineIndex] = useState<number>(-1);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const startBroadcast = () => {
        setStarted(true);
        runStreamLoop();
    };

    const runStreamLoop = async () => {
        while (true) {
            try {
                setStatus('LOADING');

                // 1. Fetch NEXT story (keep previous title on screen if possible, or show Loading)
                const res = await safe<GeneratedStory>(getStory(globalStoryIndex));

                if (!res.success) {
                    console.error("Fetch error:", res.error);
                    await delay(5000); // Retry delay
                    continue;
                }

                // 2. Data Ready -> Swap active story
                const newStory = res.data;
                globalStoryIndex++;
                console.log(newStory)
                setCurrentStory(newStory); // Visual update

                // 3. Play
                setStatus('PLAYING');
                await playSequence(newStory);

                // 4. Cooldown
                setStatus('WAITING');
                await delay(STORY_COOLDOWN_MS);

            } catch (e) {
                console.error("Loop Error:", e);
                await delay(5000);
            }
        }
    };

    const playSequence = async (storyData: GeneratedStory) => {
        const lines = storyData.dialogue;

        for (let i = 0; i < lines.length; i++) {
            setLineIndex(i); // Update UI to show new line
            const line = lines[i];

            if (line.audioUrl) {
                await playAudio(line.audioUrl);
            } else {
                // Fallback timing calculation
                await delay(1500 + line.text.length * 50);
            }

            // Short pause between lines
            await delay(600);
        }
    };

    const playAudio = (url: string) => new Promise<void>(resolve => {
        if (audioRef.current) audioRef.current.pause();
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => resolve();
        // Resolve on error too so stream doesn't hang
        audio.onerror = () => resolve();

        audio.play().catch(e => {
            console.warn("Autoplay block:", e);
            resolve();
        });
    });

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    // --- RENDER ---

    if (!started) return (
        <div className="init-screen">
            <button className="start-button" onClick={startBroadcast}>
                INITIALIZE SYSTEM
            </button>
        </div>
    );

    // Determine current line
    const activeLine = (status === 'PLAYING' && currentStory && lineIndex >= 0)
        ? currentStory.dialogue[lineIndex]
        : null;

    // Calculate progress for the bar
    const progress = (currentStory && lineIndex >= 0)
        ? ((lineIndex + 1) / currentStory.dialogue.length) * 100
        : 0;

    // Color logic
    const isMale = activeLine?.speaker.toLowerCase().match(/(man|john|detective|father|boy|male)/);
    const accentColor = isMale ? '#3b82f6' : '#ec4899'; // Blue vs Pink

    return (
        <div className="screen-layout">
            <div className="broadcast-bg">
                <div className="moving-grid"></div>
            </div>

            {/* HEADER: Shows either current story info OR "Loading Next..." */}
            <header className="broadcast-header">
                <div className="live-tag">LIVE BROADCAST</div>

                <div className="story-metadata">
                    {currentStory ? (
                        <>
                            <h1 className="story-title">{currentStory.original.title}</h1>
                            <div className="story-author">by u/{currentStory.original.author}</div>
                        </>
                    ) : (
                        <h1 className="story-title">SEARCHING FREQUENCY...</h1>
                    )}
                </div>
            </header>

            {/* CENTER STAGE */}
            <main className="stage-area">

                {/* STATE: LOADING/WAITING */}
                {(status === 'LOADING' || status === 'WAITING') && (
                    <div className="status-overlay">
                        {status === 'LOADING' ? 'DECRYPTING DATA STREAM...' : 'NEXT SEGMENT LOADING...'}
                    </div>
                )}

                {/* STATE: PLAYING */}
                {status === 'PLAYING' && activeLine && (
                    <div
                        className="dialogue-panel"
                        style={{ borderLeftColor: accentColor }}
                    >
                        {/* Speaker Name */}
                        <div className="speaker-tag" style={{ color: accentColor }}>
                            {activeLine.speaker}
                        </div>

                        {/* The Text */}
                        <div className="dialogue-text">
                            <Typewriter key={lineIndex} text={activeLine.text} speed={30} />
                        </div>

                        {/* Progress Bar */}
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${progress}%`, backgroundColor: accentColor }}
                            ></div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}

export default App;