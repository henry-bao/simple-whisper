import os
import uuid
import tempfile
import threading
import subprocess
import logging
import time
import numpy as np
import soundfile as sf

from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit
from flask_cors import CORS

import whisper
from pyaxidraw import axidraw

# ——— Setup & Logging ———
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ——— Flask + SocketIO Init ———
app = Flask(__name__, static_folder='static')
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# ——— Whisper Model ———
MODEL_SIZE = os.getenv('MODEL_SIZE', 'tiny')
logger.info(f"Loading Whisper {MODEL_SIZE} model...")
model = whisper.load_model(MODEL_SIZE)
logger.info("Whisper model loaded.")

# ——— File Folders ———
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
SVG_FOLDER    = os.path.join(os.getcwd(), 'svg')
for d in (UPLOAD_FOLDER, SVG_FOLDER):
    os.makedirs(d, exist_ok=True)

# ——— Recording Session Class ———
class RecordingSession:
    def __init__(self, sid):
        self.sid = sid
        self.chunks = []
        self.thread = None
        self.processing = False

    def add_chunk(self, chunk):
        arr = np.array(chunk, dtype=np.float32) if isinstance(chunk, list) else chunk
        self.chunks.append(arr)

    def stop_and_save(self):
        if not self.chunks:
            return None
        data = np.concatenate(self.chunks)
        path = os.path.join(UPLOAD_FOLDER, f"{uuid.uuid4()}.wav")
        sf.write(path, data, 16000)
        return path

active_sessions = {}

# ——— SVG Helpers ———
def text_to_svg(text: str) -> str:
    """
    Convert text to an SVG postcard of exactly 576×384 px,
    with the text block centered both horizontally and vertically.
    """
    W, H = 576, 384               # canvas size
    LH, FS = 24, 16               # line‐height & font‐size
    X_CENTER = W / 2

    # Split into ~80-char lines (same as before)
    words = text.split()
    lines, cur, length = [], [], 0
    for w in words:
        if length + len(w) + 1 > 80:
            lines.append(' '.join(cur)); cur, length = [w], len(w)
        else:
            cur.append(w); length += len(w) + 1
    if cur:
        lines.append(' '.join(cur))

    # Compute vertical centering
    num_lines = len(lines)
    text_block_height = num_lines * LH
    # y of first baseline so block is vertically centered
    start_y = (H - text_block_height) / 2 + FS

    # Build SVG
    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}">',
        # white background
        f'<rect width="100%" height="100%" fill="#FFF"/>'
    ]

    # Add each line, centered via text-anchor="middle"
    for i, line in enumerate(lines):
        y = start_y + i * LH
        svg.append(
            f'<text x="{X_CENTER}" y="{y}" '
            f'font-family="Arial, sans-serif" font-size="{FS}" '
            f'fill="#000" text-anchor="middle">{line}</text>'
        )

    svg.append('</svg>')
    return "\n".join(svg)


def save_svg(svg_str: str, filepath: str):
    with open(filepath, 'w') as f:
        f.write(svg_str)
    logger.info(f"SVG saved: {filepath}")

def svg_to_path(in_svg: str, out_svg: str):
    subprocess.run([
        'inkscape', in_svg,
        f'--export-plain-svg={out_svg}',
        '--export-text-to-path'
    ], check=True)
    logger.info(f"Converted to paths: {out_svg}")

# ——— AxiDraw Plotter ———
def plot_with_axi(svg_file: str, port: str = "/dev/ttyACM0"):
    ad = axidraw.AxiDraw()
    ad.interactive()
    ad.options.port = port
    ad.options.pen_pos_up = 100
    ad.options.pen_pos_down = 0
    if not ad.connect():
        logger.error(f"Cannot connect to AxiDraw on {port}")
        return
    try:
        ad.penup()
        ad.plot_setup(svg_file)
        ad.pendown()
        ad.plot_run()
        ad.penup()
        logger.info("Plot complete.")
    finally:
        ad.disconnect()

# ——— Static Route ———
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

# ——— Socket.IO Events ———
@socketio.on('start-recording')
def on_start():
    sid = request.sid
    active_sessions[sid] = RecordingSession(sid)
    emit('recording-started', {"success": True})

@socketio.on('audio-data')
def on_audio(data):
    sid = request.sid
    if sid in active_sessions:
        active_sessions[sid].add_chunk(data)

@socketio.on('stop-recording')
def on_stop():
    sid = request.sid
    sess = active_sessions.get(sid)
    if not sess or sess.processing:
        emit('transcription-result', {"success": False, "error": "Session error"})
        return

    sess.processing = True

    def worker():
        try:
            wav = sess.stop_and_save()
            if not wav:
                raise RuntimeError("No audio captured")
            # Transcribe
            res = model.transcribe(wav)
            text = res.get('text','').strip()
            os.remove(wav)

            # Text→SVG
            raw_svg = os.path.join(SVG_FOLDER, f"{uuid.uuid4()}_raw.svg")
            save_svg(text_to_svg(text), raw_svg)

            # Paths→Ready SVG
            ready_svg = os.path.join(SVG_FOLDER, f"{uuid.uuid4()}_ready.svg")
            svg_to_path(raw_svg, ready_svg)

            # Plot
            plot_with_axi(ready_svg)

            # Return to client
            socketio.emit('transcription-result', {
                "success": True,
                "text": text,
                "svg": open(raw_svg).read()
            }, room=sid)

        except Exception as e:
            logger.exception("Error in processing")
            socketio.emit('transcription-result', {
                "success": False,
                "error": str(e)
            }, room=sid)
        finally:
            # Clean-up
            del active_sessions[sid]

    threading.Thread(target=worker, daemon=True).start()

# ——— Run Server ———
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5505))
    ssl_ctx = None
    cert, key = 'ssl/cert.pem','ssl/key.pem'
    if os.path.exists(cert) and os.path.exists(key):
        ssl_ctx = (cert, key)
        logger.info("Using HTTPS")
    socketio.run(app, host='0.0.0.0', port=port, ssl_context=ssl_ctx, debug=True)
