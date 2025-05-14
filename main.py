import os
import uuid
import threading
import subprocess
import logging
import numpy as np
import soundfile as sf
import time

from flask import Flask, request, send_from_directory, jsonify
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
socketio = SocketIO(app, cors_allowed_origins="*", ping_timeout=60, ping_interval=25, async_mode='threading')

# ——— Ping Endpoint for Connection Testing ———
@app.route('/ping', methods=['GET'])
def ping():
    return jsonify({"status": "success", "message": "Server is running"})

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
class AudioRecordingSession:
    def __init__(self, sid):
        self.sid = sid
        self.chunks = []
        self.thread = None
        self.processing = False
        self.chunk_count = 0
        self.last_chunk_time = time.time()
        logger.info(f"New recording session created for {sid}")

    def add_chunk(self, chunk):
        try:
            current_time = time.time()
            time_since_last = current_time - self.last_chunk_time
            self.last_chunk_time = current_time
            
            # Ensure the chunk is a list type before processing
            if not isinstance(chunk, list):
                logger.warning(f"Received non-list chunk type: {type(chunk)}")
                return
            
            if len(chunk) == 0:
                logger.warning("Received empty chunk, skipping")
                return
                
            # Log the first chunk in detail
            if self.chunk_count == 0:
                logger.info(f"First chunk received for {self.sid}: Length={len(chunk)}, First values={chunk[:5]}")
            
            # Convert to numpy array with proper dtype
            arr = np.array(chunk, dtype=np.float32)
            
            # Check if the array has valid audio data (not all zeros or NaN)
            if np.all(arr == 0):
                logger.warning(f"Chunk {self.chunk_count} contains all zeros, but adding anyway")
            
            if np.any(np.isnan(arr)):
                logger.warning(f"Chunk {self.chunk_count} contains NaN values, filtering them")
                arr = np.nan_to_num(arr)
            
            # Add chunk to our collection
            self.chunks.append(arr)
            self.chunk_count += 1
            
            # Log periodically to avoid flooding
            if self.chunk_count == 1 or self.chunk_count % 50 == 0:
                logger.info(f"Session {self.sid}: {self.chunk_count} chunks received, time since last chunk: {time_since_last:.4f}s")
                
        except Exception as e:
            logger.error(f"Error processing audio chunk: {str(e)}")

    def stop_and_save(self):
        try:
            if not self.chunks:
                logger.warning(f"Session {self.sid}: No audio chunks to save")
                return None
                
            logger.info(f"Session {self.sid}: Concatenating {len(self.chunks)} chunks")
            
            # Additional validation before concatenation
            valid_chunks = []
            for i, chunk in enumerate(self.chunks):
                if len(chunk) > 0 and not np.all(chunk == 0):
                    valid_chunks.append(chunk)
                else:
                    logger.warning(f"Removing empty or zero chunk at index {i}")
            
            if not valid_chunks:
                logger.error(f"Session {self.sid}: No valid audio chunks after filtering")
                return None
                
            try:
                data = np.concatenate(valid_chunks)
            except ValueError as e:
                logger.error(f"Concatenation error: {str(e)}")
                # Try one more time with a different approach - create a new array and copy data
                total_length = sum(len(chunk) for chunk in valid_chunks)
                data = np.zeros(total_length, dtype=np.float32)
                idx = 0
                for chunk in valid_chunks:
                    data[idx:idx+len(chunk)] = chunk
                    idx += len(chunk)
            
            # Apply audio normalization if needed
            max_amplitude = np.max(np.abs(data))
            logger.info(f"Session {self.sid}: Max audio amplitude: {max_amplitude}")
            
            if max_amplitude < 0.01:  # If audio is too quiet
                logger.info(f"Session {self.sid}: Audio level too low, normalizing")
                if max_amplitude > 0:
                    data = data / max_amplitude * 0.9
            
            # Generate a unique filename
            path = os.path.join(UPLOAD_FOLDER, f"{uuid.uuid4()}.wav")
            
            # Log some details about the audio
            logger.info(f"Session {self.sid}: Audio shape: {data.shape}, min: {np.min(data)}, max: {np.max(data)}")
            
            # Save as wav file with 16kHz sample rate (required by Whisper)
            sf.write(path, data, 16000)
            logger.info(f"Session {self.sid}: Audio saved to {path}")
            return path
        except Exception as e:
            logger.error(f"Error saving audio: {str(e)}")
            return None

active_sessions = {}

# ——— SVG Helpers ———
def text_to_svg(text: str) -> str:
    # (identical to your second script)
    if not text:
        return '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="100"></svg>'
    W, LH, FS, X0 = 800, 24, 16, 20
    words, lines, cur, length = text.split(), [], [], 0
    for w in words:
        if length + len(w) + 1 > 80:
            lines.append(' '.join(cur)); cur, length = [w], len(w)
        else:
            cur.append(w); length += len(w) + 1
    if cur: lines.append(' '.join(cur))
    H = max(100, len(lines)*LH + 40)
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}">'
    svg += '<rect width="100%" height="100%" fill="#FFF"/>'
    for i, line in enumerate(lines):
        y = 30 + i*LH
        svg += f'<text x="{X0}" y="{y}" font-family="Arial" font-size="{FS}" fill="#000">{line}</text>'
    svg += '</svg>'
    return svg

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
@socketio.on('connect')
def handle_connect():
    logger.info(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    logger.info(f"Client disconnected: {request.sid}")
    # Clean up any active session
    if request.sid in active_sessions:
        logger.info(f"Cleaning up session for {request.sid}")
        del active_sessions[request.sid]

@socketio.on('start-recording')
def on_start():
    sid = request.sid
    logger.info(f"Starting recording for {sid}")
    active_sessions[sid] = AudioRecordingSession(sid)
    emit('recording-started', {"success": True})

@socketio.on('audio-data')
def on_audio(data):
    sid = request.sid
    if sid in active_sessions:
        active_sessions[sid].add_chunk(data)
    else:
        logger.warning(f"Received audio data for unknown session: {sid}")

@socketio.on('stop-recording')
def on_stop():
    sid = request.sid
    logger.info(f"Stopping recording for {sid}")
    
    sess = active_sessions.get(sid)
    if not sess:
        logger.error(f"No active session found for {sid}")
        emit('transcription-result', {"success": False, "error": "No active recording session found"})
        return
        
    if sess.processing:
        logger.error(f"Session {sid} is already processing")
        emit('transcription-result', {"success": False, "error": "Session is already processing"})
        return

    # Check if we received any audio chunks
    if len(sess.chunks) == 0:
        logger.error(f"No audio chunks received for session {sid}")
        emit('transcription-result', {"success": False, "error": "No audio data received"})
        return

    sess.processing = True
    logger.info(f"Starting processing for session {sid} with {len(sess.chunks)} chunks")

    def worker():
        try:
            wav = sess.stop_and_save()
            if not wav:
                logger.error(f"Session {sid}: Failed to save audio")
                raise RuntimeError("Failed to save audio for processing")
                
            logger.info(f"Session {sid}: Starting transcription")
            # Transcribe
            res = model.transcribe(wav)
            text = res.get('text','').strip()
            if not text:
                logger.warning(f"Session {sid}: Empty transcription result")
                text = "I couldn't understand what was said"
            else:
                logger.info(f"Session {sid}: Transcription: '{text}'")
                
            # Clean up the wav file
            os.remove(wav)

            # Text→SVG
            raw_svg = os.path.join(SVG_FOLDER, f"{uuid.uuid4()}_raw.svg")
            save_svg(text_to_svg(text), raw_svg)

            # Paths→Ready SVG
            ready_svg = os.path.join(SVG_FOLDER, f"{uuid.uuid4()}_ready.svg")
            svg_to_path(raw_svg, ready_svg)

            # Plot (if we're not in development mode, skip this step)
            try:
                plot_with_axi(ready_svg)
            except Exception as e:
                logger.warning(f"Plotting failed: {str(e)}")

            # Return to client
            logger.info(f"Session {sid}: Sending transcription result to client")
            socketio.emit('transcription-result', {
                "success": True,
                "text": text,
                "svg": open(raw_svg).read()
            }, room=sid)

        except Exception as e:
            logger.exception(f"Error in processing for session {sid}: {str(e)}")
            socketio.emit('transcription-result', {
                "success": False,
                "error": str(e)
            }, room=sid)
        finally:
            # Clean-up
            logger.info(f"Cleaning up session {sid}")
            if sid in active_sessions:
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
    logger.info(f"Starting server on port {port}")
    socketio.run(app, host='0.0.0.0', port=port, ssl_context=ssl_ctx, debug=True)