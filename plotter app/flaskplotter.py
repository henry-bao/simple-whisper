
#!/usr/bin/env python3
"""
Flask Plotter App for Raspberry Pi with explicit pen up/down for AxiDraw

Installs & dependencies:
  sudo apt update
  sudo apt install -y inkscape libatlas-base-dev python3-pip
  pip3 install --upgrade pip
  pip3 uninstall -y whisper
  pip3 install openai-whisper flask flask-socketio flask-cors soundfile numpy pyaxidraw

Usage:
  Save as direct_plotter.py on your Pi
  python3 direct_plotter.py
  Then record & POST:
    arecord -D plughw:1,0 -f S16_LE -c1 -r 16000 -d 5 test.wav
    curl -X POST -F "audio=@test.wav" http://10.56.129.225:8080/api/transcribe
"""
import os
import uuid
import tempfile
import logging
import subprocess
from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO
from flask_cors import CORS
import whisper
import numpy as np
import soundfile as sf

# ——— Setup & Logging ———
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='static')
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Ensure working directories exist
dir_paths = ['uploads', 'svg']
for d in dir_paths:
    os.makedirs(d, exist_ok=True)

# Load Whisper model locally
audio_model = whisper.load_model(os.getenv('MODEL_SIZE', 'tiny'))
logger.info("Whisper model loaded.")

# ——— SVG Pipeline Helpers ———
def text_to_svg(text: str) -> str:
    if not text:
        return '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="100"></svg>'
    W, LH, FS, X0 = 800, 24, 16, 20
    words = text.split()
    lines, cur, length = [], [], 0
    for w in words:
        if length + len(w) + 1 > 80:
            lines.append(' '.join(cur)); cur, length = [w], len(w)
        else:
            cur.append(w); length += len(w) + 1
    if cur:
        lines.append(' '.join(cur))
    H = max(100, len(lines) * LH + 40)
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}">' \
          + '<rect width="100%" height="100%" fill="#FFF"/>'
    for i, line in enumerate(lines):
        y_pos = 30 + i * LH
        svg += f'<text x="{X0}" y="{y_pos}" font-family="Arial" font-size="{FS}" fill="#000">{line}</text>'
    svg += '</svg>'
    return svg


def save_svg(svg_str: str, filepath: str) -> str:
    with open(filepath, 'w') as f:
        f.write(svg_str)
    logger.info(f"→ SVG saved: {filepath}")
    return filepath


def svg_to_path(raw_svg: str, out_svg: str) -> str:
    subprocess.run([
        'inkscape', raw_svg,
        f'--export-plain-svg={out_svg}',
        '--export-text-to-path'
    ], check=True)
    logger.info(f"→ Converted to paths: {out_svg}")
    return out_svg

# ——— AxiDraw Plotting with Pen Up/Down ———
def plot_with_axi(svg_file: str, port: str = "/dev/ttyACM0"):
    """
    Use AxiDraw interactive mode, explicit port, pen up/down,
    then plot the given SVG.
    """
    try:
        from pyaxidraw import axidraw
    except ImportError:
        try:
            from axidraw import axidraw
        except ImportError:
            logger.error("AxiDraw module not found. Install pyaxidraw or AxiDraw_API.zip.")
            return

    ad = axidraw.AxiDraw()
    logger.info("Entering interactive mode for manual port config...")
    ad.interactive()
    ad.options.port = port

    if ad.connect():
        logger.info(f"✅ AxiDraw connected on {port}")
        try:
            # Lift pen before any movement
            ad.penup()

            # Move to start and load SVG
            ad.plot_setup(svg_file)

            # Lower pen to start drawing
            ad.pendown()

            # Run the plot
            ad.plot_run()

            # Lift pen when done
            ad.penup()

            logger.info("→ Plot run complete.")
        except Exception as e:
            logger.error(f"Plotting error: {e}")
        finally:
            try:
                ad.disconnect()
            except Exception:
                pass
    else:
        logger.error(f"❌ Failed to connect to AxiDraw on {port}")

# ——— HTTP Endpoint ———
@app.route('/api/transcribe', methods=['POST'])
def api_transcribe():
    if 'audio' not in request.files:
        return jsonify(success=False, error="No audio file"), 400

    # Save upload
    wf = request.files['audio']
    wav_name = f"{uuid.uuid4()}.wav"
    wav_path = os.path.join('uploads', wav_name)
    wf.save(wav_path)

    # Transcribe
    logger.info(f"Transcribing {wav_path}")
    result = audio_model.transcribe(wav_path)
    os.remove(wav_path)
    text = result.get('text', '').strip()
    logger.info(f"Transcript: {text}")

    # SVG pipeline
    raw_svg = os.path.join('svg', f"{uuid.uuid4()}_raw.svg")
    save_svg(text_to_svg(text), raw_svg)
    ready_svg = os.path.join('svg', f"{uuid.uuid4()}_ready.svg")
    svg_to_path(raw_svg, ready_svg)

    # Plot
    plot_with_axi(ready_svg)

    return jsonify(success=True, text=text)

if __name__ == '__main__':
    HOST, PORT = '0.0.0.0', 8080
    logger.info(f"Server listening at http://{HOST}:{PORT}")
    socketio.run(app, host=HOST, port=PORT, debug=True)
