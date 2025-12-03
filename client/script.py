import pygame
import requests
import threading
import time
import io
import sys

# --- CONFIGURATION FROM YOUR REACT APP ---
# Based on your consts.ts and all.ts
API_BASE = "http://localhost:4000"
ENDPOINT = "/story"
API_URL = f"{API_BASE}{ENDPOINT}"

# Display Settings
WIDTH, HEIGHT = 1920, 1080
FPS = 60

# Colors
COLOR_BG = (10, 10, 14)           # Deep dark blue/black
COLOR_PANEL = (22, 22, 28)        # Slightly lighter panel
COLOR_BORDER = (40, 40, 50)
COLOR_TEXT_MAIN = (255, 255, 255)
COLOR_TEXT_DIM = (140, 140, 150)
COLOR_ACCENT_MALE = (56, 189, 248)   # Light Blue (Tailwind Sky-400)
COLOR_ACCENT_FEMALE = (244, 114, 182) # Pink (Tailwind Pink-400)

# --- ENGINE STATE MANAGEMENT ---
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
        self.audio_clips = []  # List of pygame.Sound objects
        self.current_index = 0
        
        # Audio
        self.channel = pygame.mixer.Channel(0)
        
        # Text Animation
        self.display_text = ""
        self.full_text = ""
        self.char_timer = 0
        self.char_interval = 30 # ms between characters
        
        # Threading
        self.thread_running = False
        self.next_payload = None # Storage for fetched data
        self.error_msg = ""

    def start_fetch(self):
        """Starts the background downloader thread."""
        if self.thread_running: return
        self.thread_running = True
        self.error_msg = ""
        
        thread = threading.Thread(target=self._fetch_logic)
        thread.daemon = True
        thread.start()

    def _fetch_logic(self):
        """Background thread: Downloads JSON and Audio."""
        try:
            print(f"[*] Connecting to {API_URL}...")
            
            # 1. Get Story JSON
            # Note: Your React code does NOT send an index, so we won't either.
            resp = requests.get(API_URL, timeout=10)
            
            if resp.status_code != 200:
                raise Exception(f"Server returned {resp.status_code}")
                
            data = resp.json()
            
            # Validate Data
            if 'dialogue' not in data:
                # Handle wrapped response { success: true, data: ... } if necessary
                if 'data' in data and 'dialogue' in data['data']:
                    data = data['data']
                else:
                    raise Exception("Invalid JSON Format: Missing 'dialogue'")

            print(f"[*] Story received: {data.get('original', {}).get('title', 'Unknown')}")

            # 2. Download Audio Blobs
            audio_objects = []
            for i, line in enumerate(data['dialogue']):
                sound = None
                url = line.get('audioUrl')
                
                if url:
                    # Handle relative URLs if your API returns them (e.g., "/audio/1.mp3")
                    if url.startswith('/'):
                        url = f"{API_BASE}{url}"
                        
                    try:
                        audio_resp = requests.get(url, timeout=15)
                        if audio_resp.status_code == 200:
                            # Load MP3 bytes directly into memory
                            sound_file = io.BytesIO(audio_resp.content)
                            sound = pygame.mixer.Sound(sound_file)
                    except Exception as e:
                        print(f"[!] Audio download failed for line {i}: {e}")
                
                audio_objects.append(sound)

            # 3. Store Result
            self.next_payload = (data, audio_objects)

        except Exception as e:
            print(f"[!] FETCH ERROR: {e}")
            self.error_msg = str(e)
        
        finally:
            self.thread_running = False

    def update(self, dt_ms):
        """Main Logic Loop"""
        current_time = pygame.time.get_ticks()

        # --- STATE: LOADING ---
        if self.state == State.LOADING:
            if not self.thread_running:
                if self.next_payload:
                    # Apply Data
                    self.story_data, self.audio_clips = self.next_payload
                    self.next_payload = None
                    self.current_index = 0
                    self.state = State.PLAYING
                    self._setup_line(0)
                elif self.error_msg:
                    self.state = State.ERROR
                else:
                    # Should not happen, but restart fetch if stuck
                    self.start_fetch()
            return

        # --- STATE: PLAYING ---
        if self.state == State.PLAYING:
            if not self.story_data: return

            # 1. Typewriter Effect
            if len(self.display_text) < len(self.full_text):
                self.char_timer += dt_ms
                if self.char_timer >= self.char_interval:
                    self.char_timer = 0
                    # Add one character
                    self.display_text = self.full_text[:len(self.display_text)+1]

            # 2. Check Line Completion
            is_audio_playing = self.channel.get_busy()
            text_finished = len(self.display_text) >= len(self.full_text)
            
            # Logic: If audio exists, wait for audio. If no audio, wait for text + 2 seconds.
            current_audio = self.audio_clips[self.current_index]
            
            should_advance = False
            if current_audio:
                if not is_audio_playing and text_finished:
                    should_advance = True
            else:
                # No audio fallback timing
                # (Roughly 1s + time to read)
                if text_finished and self.char_timer > 2000: 
                    should_advance = True

            if should_advance:
                # Small pause between lines
                pygame.time.wait(500)
                self.current_index += 1
                
                if self.current_index < len(self.story_data['dialogue']):
                    self._setup_line(self.current_index)
                else:
                    self.state = State.WAITING
                    self.wait_start_time = current_time

        # --- STATE: WAITING ---
        if self.state == State.WAITING:
            # Wait 5 seconds before next story
            if current_time - self.wait_start_time > 5000:
                self.state = State.LOADING
                self.start_fetch()
                
        # --- STATE: ERROR ---
        if self.state == State.ERROR:
            # Auto-retry after 5 seconds
            if current_time % 5000 < 100:
                self.state = State.LOADING
                self.start_fetch()

    def _setup_line(self, index):
        """Prepares the next line for playback"""
        line = self.story_data['dialogue'][index]
        audio = self.audio_clips[index]
        
        self.full_text = line['text']
        self.display_text = ""
        self.char_timer = 0
        
        if audio:
            self.channel.play(audio)


# --- DRAWING HELPERS ---

def draw_wrapped_text(surface, text, font, color, rect):
    """Draws text inside a rectangle with wrapping."""
    words = text.split(' ')
    lines = []
    current_line = []
    
    # Wrap
    for word in words:
        test_line = ' '.join(current_line + [word])
        w, h = font.size(test_line)
        if w < rect.width:
            current_line.append(word)
        else:
            lines.append(' '.join(current_line))
            current_line = [word]
    lines.append(' '.join(current_line))
    
    # Render
    y = rect.y
    line_h = font.get_linesize()
    for line in lines:
        if y + line_h > rect.bottom: break
        
        # Shadow
        s_surf = font.render(line, True, (0,0,0))
        surface.blit(s_surf, (rect.x + 2, y + 2))
        
        # Text
        t_surf = font.render(line, True, color)
        surface.blit(t_surf, (rect.x, y))
        y += line_h

def main():
    pygame.init()
    pygame.mixer.init()
    
    screen = pygame.display.set_mode((WIDTH, HEIGHT), pygame.FULLSCREEN | pygame.SCALED)
    pygame.display.set_caption("Reddit Story Broadcast")
    clock = pygame.time.Clock()

    # --- FONTS ---
    # Using generic system fonts to ensure it runs on your PC
    font_large = pygame.font.SysFont("arial", 48, bold=True)
    font_medium = pygame.font.SysFont("arial", 32)
    font_small = pygame.font.SysFont("arial", 24, bold=True)
    font_mono = pygame.font.SysFont("consolas", 28, bold=True)

    engine = BroadcastEngine()
    
    # Background Particles
    import random
    stars = [{'x': random.randint(0, WIDTH), 'y': random.randint(0, HEIGHT), 's': random.randint(1,3)} for _ in range(100)]

    running = True
    while running:
        dt = clock.tick(FPS)
        
        # 1. Inputs
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
                if event.key == pygame.K_SPACE and engine.state == State.IDLE:
                    engine.state = State.LOADING
                    engine.start_fetch()

        # 2. Logic
        engine.update(dt)
        
        # 3. Animation (Stars)
        for s in stars:
            s['y'] -= s['s'] * 0.5
            if s['y'] < 0:
                s['y'] = HEIGHT
                s['x'] = random.randint(0, WIDTH)

        # 4. Drawing
        screen.fill(COLOR_BG)
        
        # Draw Stars
        for s in stars:
            pygame.draw.circle(screen, (50, 50, 60), (int(s['x']), int(s['y'])), s['s'])
            
        # UI LAYOUT
        
        if engine.state == State.IDLE:
            # Start Screen
            lbl = font_large.render("SYSTEM READY // PRESS SPACE TO CONNECT", True, COLOR_TEXT_MAIN)
            screen.blit(lbl, (WIDTH//2 - lbl.get_width()//2, HEIGHT//2))
            
            sub = font_small.render(f"Target: {API_URL}", True, COLOR_TEXT_DIM)
            screen.blit(sub, (WIDTH//2 - sub.get_width()//2, HEIGHT//2 + 60))

        else:
            # --- HEADER ---
            header_h = 100
            pygame.draw.rect(screen, COLOR_PANEL, (0, 0, WIDTH, header_h))
            pygame.draw.line(screen, COLOR_BORDER, (0, header_h), (WIDTH, header_h), 2)
            
            # Live Badge
            pygame.draw.rect(screen, (220, 20, 20), (50, 30, 80, 40), border_radius=4)
            lbl_live = font_small.render("LIVE", True, (255,255,255))
            screen.blit(lbl_live, (70, 38))
            
            # Story Metadata
            if engine.story_data:
                orig = engine.story_data.get('original', {})
                title = orig.get('title', 'Unknown Title')
                author = orig.get('author', 'Unknown Author')
                
                t_surf = font_large.render(title, True, COLOR_TEXT_MAIN)
                a_surf = font_medium.render(f"u/{author}", True, COLOR_TEXT_DIM)
                
                screen.blit(t_surf, (160, 20))
                screen.blit(a_surf, (WIDTH - a_surf.get_width() - 50, 35))
            else:
                lbl_load = font_large.render("ESTABLISHING LINK...", True, COLOR_TEXT_DIM)
                screen.blit(lbl_load, (160, 20))

            # --- MAIN CONTENT ---
            if engine.state == State.PLAYING and engine.story_data:
                line = engine.story_data['dialogue'][engine.current_index]
                
                # Colors based on Speaker
                spk = line['speaker']
                is_male = any(x in spk.lower() for x in ['man', 'male', 'john', 'father', 'detective'])
                accent = COLOR_ACCENT_MALE if is_male else COLOR_ACCENT_FEMALE
                
                # Panel Box
                panel_rect = pygame.Rect(100, HEIGHT//2 - 150, WIDTH-200, 400)
                pygame.draw.rect(screen, COLOR_PANEL, panel_rect, border_radius=12)
                pygame.draw.rect(screen, COLOR_BORDER, panel_rect, 2, border_radius=12)
                
                # Left Accent Line
                pygame.draw.rect(screen, accent, (panel_rect.x, panel_rect.y+20, 6, panel_rect.height-40))
                
                # Speaker Name
                name_surf = font_mono.render(spk.upper(), True, accent)
                screen.blit(name_surf, (panel_rect.x + 40, panel_rect.y + 40))
                
                # The Text (Typewriter)
                text_area = pygame.Rect(panel_rect.x + 40, panel_rect.y + 100, panel_rect.width - 80, panel_rect.height - 120)
                draw_wrapped_text(screen, engine.display_text, font_large, COLOR_TEXT_MAIN, text_area)
            
            # --- FOOTER / STATUS ---
            if engine.state == State.LOADING:
                msg = font_small.render("DOWNLOADING NEXT STORY PACKAGE...", True, COLOR_TEXT_DIM)
                screen.blit(msg, (WIDTH//2 - msg.get_width()//2, HEIGHT - 80))
            
            elif engine.state == State.WAITING:
                msg = font_small.render("BROADCAST ENDED. NEXT STORY IN 5 SECONDS...", True, COLOR_TEXT_DIM)
                screen.blit(msg, (WIDTH//2 - msg.get_width()//2, HEIGHT - 80))
            
            elif engine.state == State.ERROR:
                err = font_medium.render(f"CONNECTION ERROR: {engine.error_msg}", True, (255, 100, 100))
                retry = font_small.render("RETRYING AUTOMATICALLY...", True, (255, 100, 100))
                screen.blit(err, (WIDTH//2 - err.get_width()//2, HEIGHT//2))
                screen.blit(retry, (WIDTH//2 - retry.get_width()//2, HEIGHT//2 + 50))

        pygame.display.flip()

    pygame.quit()
    sys.exit()

if __name__ == "__main__":
    main()