import os
import io
import sys
import time
import random
import threading
import requests
import pygame
import subprocess
import platform
from dotenv import load_dotenv

# --- 1. CONFIGURATION ---

load_dotenv() 

STREAM_KEY = os.getenv("YOUTUBE_STREAM_KEY")
API_BASE = "http://localhost:4000"
ENDPOINT = "/story"
API_URL = f"{API_BASE}{ENDPOINT}"

# RESOLUTION: 
# Since we are piping raw data, we can use 1080p on Windows without issues.
WIDTH, HEIGHT = 1920, 1080
FPS = 30 

# Colors
COLOR_BG = (10, 10, 14)
COLOR_PANEL = (22, 22, 28)
COLOR_BORDER = (40, 40, 50)
COLOR_TEXT_MAIN = (255, 255, 255)
COLOR_TEXT_DIM = (140, 140, 150)
COLOR_ACCENT_MALE = (56, 189, 248)   
COLOR_ACCENT_FEMALE = (244, 114, 182) 

# --- 2. ENGINE LOGIC ---

class State:
    IDLE = "IDLE"
    LOADING = "LOADING"
    PLAYING = "PLAYING"
    WAITING = "WAITING"
    ERROR = "ERROR"

class BroadcastEngine:
    def __init__(self):
        self.state = State.IDLE
        self.story_data = None
        self.audio_clips = []
        self.current_index = 0
        self.channel = pygame.mixer.Channel(0)
        self.display_text = ""
        self.full_text = ""
        self.char_timer = 0
        self.char_interval = 30
        self.thread_running = False
        self.next_payload = None
        self.error_msg = ""
        self.wait_start_time = 0

    def start_fetch(self):
        if self.thread_running: return
        self.thread_running = True
        self.error_msg = ""
        thread = threading.Thread(target=self._fetch_logic)
        thread.daemon = True
        thread.start()

    def _fetch_logic(self):
        try:
            print(f"[*] Fetching story from {API_URL}...")
            resp = requests.get(API_URL, timeout=15)
            
            if resp.status_code != 200:
                raise Exception(f"HTTP {resp.status_code}")
            
            data = resp.json()
            if 'dialogue' not in data and 'data' in data:
                data = data['data']
            
            if 'dialogue' not in data:
                raise Exception("JSON missing 'dialogue'")

            print(f"[*] Received: {data.get('original', {}).get('title', 'Untitled')}")

            audio_objects = []
            for i, line in enumerate(data['dialogue']):
                sound = None
                url = line.get('audioUrl')
                if url:
                    if url.startswith('/'): url = f"{API_BASE}{url}"
                    try:
                        r = requests.get(url, timeout=10)
                        if r.status_code == 200:
                            sound = pygame.mixer.Sound(io.BytesIO(r.content))
                    except Exception as e:
                        print(f"[!] Audio download fail line {i}: {e}")
                audio_objects.append(sound)

            self.next_payload = (data, audio_objects)

        except Exception as e:
            print(f"[!] Fetch Error: {e}")
            self.error_msg = str(e)
        finally:
            self.thread_running = False

    def update(self, dt_ms):
        current_time = pygame.time.get_ticks()

        if self.state == State.IDLE:
            self.state = State.LOADING
            self.start_fetch()

        if self.state == State.LOADING:
            if not self.thread_running:
                if self.next_payload:
                    self.story_data, self.audio_clips = self.next_payload
                    self.next_payload = None
                    self.current_index = 0
                    self.state = State.PLAYING
                    self._setup_line(0)
                elif self.error_msg:
                    self.state = State.ERROR
                    self.wait_start_time = current_time

        if self.state == State.PLAYING:
            if not self.story_data: return
            if len(self.display_text) < len(self.full_text):
                self.char_timer += dt_ms
                if self.char_timer >= self.char_interval:
                    self.char_timer = 0
                    self.display_text = self.full_text[:len(self.display_text)+1]

            is_audio_playing = self.channel.get_busy()
            text_finished = len(self.display_text) >= len(self.full_text)
            current_audio = self.audio_clips[self.current_index]
            
            should_advance = False
            if current_audio:
                if not is_audio_playing and text_finished:
                    should_advance = True
            else:
                if text_finished and self.char_timer > 2000:
                    should_advance = True

            if should_advance:
                pygame.time.wait(300)
                self.current_index += 1
                if self.current_index < len(self.story_data['dialogue']):
                    self._setup_line(self.current_index)
                else:
                    self.state = State.WAITING
                    self.wait_start_time = current_time

        if self.state == State.WAITING:
            if current_time - self.wait_start_time > 5000:
                self.state = State.LOADING
                self.start_fetch()

        if self.state == State.ERROR:
            if current_time - self.wait_start_time > 5000:
                self.state = State.LOADING
                self.start_fetch()

    def _setup_line(self, index):
        line = self.story_data['dialogue'][index]
        audio = self.audio_clips[index]
        self.full_text = line['text']
        self.display_text = ""
        self.char_timer = 0
        if audio:
            self.channel.play(audio)

# --- 3. HELPER FUNCTIONS ---

def draw_wrapped_text(surface, text, font, color, rect):
    words = text.split(' ')
    lines = []
    current_line = []
    for word in words:
        test_line = ' '.join(current_line + [word])
        w, _ = font.size(test_line)
        if w < rect.width:
            current_line.append(word)
        else:
            lines.append(' '.join(current_line))
            current_line = [word]
    lines.append(' '.join(current_line))
    
    y = rect.y
    line_h = font.get_linesize()
    for line in lines:
        if y + line_h > rect.bottom: break
        surface.blit(font.render(line, True, (0,0,0)), (rect.x+2, y+2))
        surface.blit(font.render(line, True, color), (rect.x, y))
        y += line_h

def start_ffmpeg_stream():
    """Configures FFmpeg to read raw video from STDIN pipe"""
    if not STREAM_KEY:
        print("❌ ERROR: YOUTUBE_STREAM_KEY not found in .env")
        return None

    cmd = []
    
    # Common RAW VIDEO input args
    # This tells FFmpeg: "We are sending you raw pixels, not a file"
    input_args = [
        'ffmpeg', '-y',
        '-f', 'rawvideo',
        '-vcodec', 'rawvideo',
        '-s', f'{WIDTH}x{HEIGHT}', # Must match Pygame surface exactly
        '-pix_fmt', 'rgb24',       # Pygame outputs RGB
        '-r', str(FPS),
        '-i', '-',                 # Listen to Pipe (STDIN)
    ]

    # OS Specific Audio Args
    if platform.system() == 'Windows':
        print("🎥 FFmpeg Windows: Piping raw frames (Window can be minimized)...")
        # Windows Audio is hard to pipe. We use silent audio for stability.
        # If you need real audio on Windows, you need 'Stereo Mix' enabled and -f dshow.
        cmd = input_args + [
            '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
        ]
    else:
        print("🎥 FFmpeg Linux: Piping raw frames + PulseAudio...")
        # On Linux, we grab PulseAudio 'monitor' separately
        cmd = input_args + [
            '-f', 'pulse', '-i', 'default', 
        ]

    # Encoding & Output Args
    output_args = [
        '-c:v', 'libx264', '-preset', 'veryfast', 
        '-b:v', '4500k', '-maxrate', '5000k', '-bufsize', '10000k',
        '-pix_fmt', 'yuv420p', # Convert RGB to YUV for YouTube
        '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
        '-f', 'flv', f'rtmp://a.rtmp.youtube.com/live2/{STREAM_KEY}'
    ]

    full_cmd = cmd + output_args
    
    # Open process with STDIN PIPE (for writing video) and STDOUT PIPE (for logs)
    return subprocess.Popen(full_cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)

# --- 4. MAIN LOOP ---

def main():
    pygame.init()
    pygame.mixer.init()
    
    # We create the screen, but we don't care if it's visible.
    # We use SCALED so it doesn't take up huge space on dev machine, 
    # but the internal resolution stays 1920x1080.
    flags = pygame.SCALED | pygame.RESIZABLE
    
    # To make it fully "Invisible", you can use flags=pygame.HIDDEN (Experimental)
    # or just minimize it manually.
    
    screen = pygame.display.set_mode((WIDTH, HEIGHT), flags)
    pygame.display.set_caption("Story Stream (Minimize Me!)") 
    clock = pygame.time.Clock()

    font_large = pygame.font.SysFont("arial", 48, bold=True)
    font_medium = pygame.font.SysFont("arial", 32)
    font_mono = pygame.font.SysFont("consolas", 28, bold=True)

    engine = BroadcastEngine()
    stars = [{'x': random.randint(0, WIDTH), 'y': random.randint(0, HEIGHT), 's': random.randint(1,3)} for _ in range(80)]

    ffmpeg_process = start_ffmpeg_stream()

    # Logging Thread
    def log_ffmpeg():
        if ffmpeg_process and ffmpeg_process.stdout:
            for line in iter(ffmpeg_process.stdout.readline, b''):
                l = line.decode('utf-8', errors='ignore').strip()
                if any(k in l for k in ["Error", "fail", "kB/s"]):
                     if "kB/s" in l: print(f"\r[STREAM] {l}", end="") 
                     else: print(f"\n[FFMPEG] {l}")

    threading.Thread(target=log_ffmpeg, daemon=True).start()

    print("\n✅ Stream Started. You can minimize the window now.\n")

    running = True
    try:
        while running:
            dt = clock.tick(FPS)
            for event in pygame.event.get():
                if event.type == pygame.QUIT: running = False

            engine.update(dt)

            # Draw Everything
            screen.fill(COLOR_BG)
            for s in stars:
                s['y'] -= s['s'] * 0.5
                if s['y'] < 0:
                    s['y'] = HEIGHT; s['x'] = random.randint(0, WIDTH)
                pygame.draw.circle(screen, (50, 50, 60), (int(s['x']), int(s['y'])), s['s'])

            if engine.state != State.IDLE:
                pygame.draw.rect(screen, COLOR_PANEL, (0, 0, WIDTH, 80))
                pygame.draw.line(screen, COLOR_BORDER, (0, 80), (WIDTH, 80), 2)
                
                pygame.draw.rect(screen, (220, 20, 20), (30, 20, 70, 40), border_radius=4)
                screen.blit(font_medium.render("LIVE", True, (255,255,255)), (45, 25))

                if engine.story_data:
                    orig = engine.story_data.get('original', {})
                    t = font_medium.render(orig.get('title', 'Unknown'), True, COLOR_TEXT_MAIN)
                    screen.blit(t, (120, 25))

                if engine.state == State.PLAYING and engine.story_data:
                    line = engine.story_data['dialogue'][engine.current_index]
                    spk = line['speaker']
                    is_male = any(x in spk.lower() for x in ['man', 'male'])
                    accent = COLOR_ACCENT_MALE if is_male else COLOR_ACCENT_FEMALE
                    
                    panel_w = WIDTH * 0.8
                    panel_h = HEIGHT * 0.5
                    panel_x = (WIDTH - panel_w) // 2
                    panel_y = (HEIGHT - panel_h) // 2
                    
                    pygame.draw.rect(screen, COLOR_PANEL, (panel_x, panel_y, panel_w, panel_h), border_radius=12)
                    pygame.draw.rect(screen, COLOR_BORDER, (panel_x, panel_y, panel_w, panel_h), 2, border_radius=12)
                    pygame.draw.rect(screen, accent, (panel_x, panel_y+20, 6, panel_h-40))
                    
                    screen.blit(font_mono.render(spk.upper(), True, accent), (panel_x + 30, panel_y + 30))
                    
                    text_area = pygame.Rect(panel_x + 30, panel_y + 80, panel_w - 60, panel_h - 100)
                    draw_wrapped_text(screen, engine.display_text, font_large, COLOR_TEXT_MAIN, text_area)

                if engine.state == State.LOADING:
                    s = font_medium.render("DOWNLOADING STORY...", True, COLOR_TEXT_DIM)
                    screen.blit(s, (WIDTH//2 - s.get_width()//2, HEIGHT - 60))

            # Update Display (For local preview)
            pygame.display.flip()

            # --- THE MAGIC: PIPE FRAME TO FFMPEG ---
            # 1. Get raw pixel data as a string
            raw_data = pygame.image.tostring(screen, 'RGB')
            
            # 2. Write to FFmpeg stdin
            if ffmpeg_process:
                ffmpeg_process.stdin.write(raw_data)
            # ---------------------------------------

    except KeyboardInterrupt:
        print("\nStopping...")
    except BrokenPipeError:
        print("\n[FFMPEG] Broken Pipe. FFmpeg likely crashed.")
    finally:
        if ffmpeg_process: ffmpeg_process.terminate()
        pygame.quit()
        sys.exit()

if __name__ == "__main__":
    main()