import os
import tempfile
import uuid
import threading
import numpy as np
import time
from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import whisper
import soundfile as sf
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def text_to_svg(text):
    """Convert text to an SVG representation."""
    if not text:
        return '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="100"></svg>'
    
    # Basic SVG settings
    svg_width = 800
    line_height = 24
    font_size = 16
    x_pos = 20
    
    # Split text into lines (approximately 80 chars per line)
    words = text.split()
    lines = []
    current_line = []
    current_length = 0
    
    for word in words:
        if current_length + len(word) + 1 > 80:  # +1 for the space
            lines.append(' '.join(current_line))
            current_line = [word]
            current_length = len(word)
        else:
            current_line.append(word)
            current_length += len(word) + 1
    
    if current_line:
        lines.append(' '.join(current_line))
    
    # Calculate SVG height based on number of lines
    svg_height = max(100, (len(lines) * line_height) + 40)
    
    # Create SVG header
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{svg_width}" height="{svg_height}">'
    
    # Add rectangle background
    svg += f'<rect width="100%" height="100%" fill="#f9f9f9" />'
    
    # Add text elements for each line
    for i, line in enumerate(lines):
        y_pos = (i * line_height) + 30
        svg += f'<text x="{x_pos}" y="{y_pos}" font-family="Arial, sans-serif" font-size="{font_size}" fill="#333">{line}</text>'
    
    # Close SVG
    svg += '</svg>'
    return svg

# Initialize Flask app
app = Flask(__name__, static_folder='static')
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Create uploads directory if it doesn't exist
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Initialize Whisper model
# Model options: "tiny", "base", "small", "medium", "large"
MODEL_SIZE = "base"
logger.info(f"Loading Whisper {MODEL_SIZE} model...")
model = whisper.load_model(MODEL_SIZE)
logger.info("Model loaded successfully!")

# Active recording sessions
active_sessions = {}

class RecordingSession:
    def __init__(self, sid):
        self.sid = sid
        self.audio_chunks = []
        self.temp_file = None
        self.temp_file_path = None
        self.is_processing = False
        self.real_time_mode = False
        self.real_time_thread = None
        self.should_stop_real_time = False
        self.buffer_size = 5  # Number of seconds of audio to process at once
        self.sample_rate = 16000  # Sample rate in Hz
        self.last_transcription_time = 0
        self.accumulated_text = ""

    def start_recording(self, real_time=False):
        # Create a temporary file for this recording session
        self.temp_file = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
        self.temp_file_path = self.temp_file.name
        self.real_time_mode = real_time
        logger.info(f"Started recording session: {self.sid}, temp file: {self.temp_file_path}, real-time mode: {real_time}")
        
        # Start real-time processing thread if needed
        if real_time:
            self.should_stop_real_time = False
            self.real_time_thread = threading.Thread(target=self._process_real_time)
            self.real_time_thread.daemon = True
            self.real_time_thread.start()

    def add_chunk(self, chunk):
        # Convert chunk from list to numpy array if necessary
        if isinstance(chunk, list):
            chunk = np.array(chunk, dtype=np.float32)
        
        # Add chunk to the list
        self.audio_chunks.append(chunk)

    def _process_real_time(self):
        """Process audio in real-time as chunks come in"""
        logger.info(f"Starting real-time processing for session {self.sid}")
        
        while not self.should_stop_real_time:
            # Check if we have enough audio data (about buffer_size seconds)
            if len(self.audio_chunks) > 0:
                total_samples = sum(len(chunk) for chunk in self.audio_chunks)
                
                # If we have enough data (buffer_size seconds)
                if total_samples >= self.buffer_size * self.sample_rate:
                    try:
                        # Make a copy of the audio chunks to process
                        chunks_to_process = self.audio_chunks.copy()
                        
                        # Create a temporary file for this chunk
                        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_chunk_file:
                            temp_chunk_path = temp_chunk_file.name
                            
                            # Combine chunks
                            audio_data = np.concatenate(chunks_to_process)
                            
                            # Write to temporary file
                            sf.write(temp_chunk_path, audio_data, self.sample_rate)
                            
                            # Transcribe the audio
                            result = model.transcribe(temp_chunk_path)
                            transcribed_text = result["text"].strip()
                            
                            # Update accumulated text
                            if transcribed_text:
                                if not self.accumulated_text:
                                    self.accumulated_text = transcribed_text
                                else:
                                    self.accumulated_text += " " + transcribed_text
                                
                                # Convert to SVG
                                svg_output = text_to_svg(self.accumulated_text)
                                
                                # Send intermediate result back to client
                                socketio.emit('real-time-transcription', {
                                    "text": transcribed_text,
                                    "full_text": self.accumulated_text,
                                    "svg": svg_output,
                                    "success": True
                                }, room=self.sid)
                            
                            # Clean up temp file
                            os.unlink(temp_chunk_path)
                            
                            # Reset audio chunks but keep latest ones that might contain unprocessed speech
                            # Retain about 0.5 seconds to avoid cutting words
                            overlap_samples = int(0.5 * self.sample_rate)
                            if total_samples > overlap_samples:
                                # Find how many chunks to keep from the end
                                samples_so_far = 0
                                chunks_to_keep = 0
                                for i in range(len(self.audio_chunks) - 1, -1, -1):
                                    samples_so_far += len(self.audio_chunks[i])
                                    chunks_to_keep += 1
                                    if samples_so_far >= overlap_samples:
                                        break
                                
                                # Keep only the required overlap chunks
                                self.audio_chunks = self.audio_chunks[-chunks_to_keep:]
                            
                    except Exception as e:
                        logger.error(f"Error in real-time transcription: {str(e)}")
            
            # Sleep to avoid CPU overuse
            time.sleep(0.1)
        
        logger.info(f"Stopped real-time processing for session {self.sid}")

    def stop_recording(self):
        # Stop real-time processing if it's running
        if self.real_time_mode and self.real_time_thread:
            self.should_stop_real_time = True
            self.real_time_thread.join(timeout=2.0)
            logger.info(f"Stopped real-time thread for session {self.sid}")
        
        if not self.audio_chunks:
            logger.warning(f"No audio data received for session {self.sid}")
            return None
        
        try:
            # Close the temp file if it's open
            if self.temp_file:
                self.temp_file.close()
            
            # Combine all audio chunks
            audio_data = np.concatenate(self.audio_chunks)
            
            # Write to the temporary file
            sf.write(self.temp_file_path, audio_data, 16000)
            
            logger.info(f"Saved audio to {self.temp_file_path}, length: {len(audio_data)} samples")
            return self.temp_file_path
            
        except Exception as e:
            logger.error(f"Error saving audio: {str(e)}")
            return None

    def clean_up(self):
        # Stop real-time processing if it's running
        if self.real_time_mode and self.real_time_thread:
            self.should_stop_real_time = True
            if self.real_time_thread.is_alive():
                self.real_time_thread.join(timeout=2.0)
        
        # Remove the temporary file
        if self.temp_file_path and os.path.exists(self.temp_file_path):
            try:
                os.unlink(self.temp_file_path)
                logger.info(f"Removed temporary file: {self.temp_file_path}")
            except Exception as e:
                logger.error(f"Error removing temp file: {str(e)}")
        
        # Clear audio chunks
        self.audio_chunks = []
        self.temp_file = None
        self.temp_file_path = None
        self.accumulated_text = ""

# Route for serving the static frontend
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

# Route for file upload transcription
@app.route('/api/transcribe', methods=['POST'])
def transcribe_file():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file uploaded", "success": False}), 400
    
    audio_file = request.files['audio']
    
    # Generate a unique filename
    filename = str(uuid.uuid4()) + '.wav'
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    
    # Save the uploaded file
    audio_file.save(filepath)
    
    try:
        # Transcribe the audio file
        logger.info(f"Transcribing file: {filepath}")
        result = model.transcribe(filepath)
        
        # Clean up the uploaded file
        os.remove(filepath)
        
        # Convert text to SVG
        text = result["text"]
        svg_output = text_to_svg(text)
        
        return jsonify({
            "text": text,
            "svg": svg_output,
            "success": True
        })
    
    except Exception as e:
        logger.error(f"Error transcribing file: {str(e)}")
        
        # Clean up the uploaded file
        if os.path.exists(filepath):
            os.remove(filepath)
        
        return jsonify({
            "error": str(e),
            "success": False
        }), 500

# Socket.IO event handlers
@socketio.on('connect')
def handle_connect():
    # Get socket ID from the connection event
    sid = request.sid if hasattr(request, 'sid') else socketio.sid
    logger.info(f"Client connected: {sid}")

@socketio.on('disconnect')
def handle_disconnect():
    # Get socket ID from the connection event
    sid = request.sid if hasattr(request, 'sid') else socketio.sid
    logger.info(f"Client disconnected: {sid}")
    
    # Clean up any ongoing recording session
    if sid in active_sessions:
        session = active_sessions[sid]
        session.clean_up()
        del active_sessions[sid]

@socketio.on('start-recording')
def handle_start_recording():
    # Get socket ID correctly from Socket.IO
    sid = request.sid if hasattr(request, 'sid') else socketio.sid
    logger.info(f"Start recording request from {sid}")
    
    # Create a new recording session
    session = RecordingSession(sid)
    session.start_recording()
    active_sessions[sid] = session
    
    emit('recording-started', {"success": True})

@socketio.on('start-real-time')
def handle_start_real_time():
    # Get socket ID correctly from Socket.IO
    sid = request.sid if hasattr(request, 'sid') else socketio.sid
    logger.info(f"Start real-time transcription request from {sid}")
    
    # Create a new recording session with real-time mode
    session = RecordingSession(sid)
    session.start_recording(real_time=True)
    active_sessions[sid] = session
    
    emit('real-time-started', {"success": True})

@socketio.on('audio-data')
def handle_audio_data(data):
    # Get socket ID correctly from Socket.IO
    sid = request.sid if hasattr(request, 'sid') else socketio.sid
    
    if sid in active_sessions:
        session = active_sessions[sid]
        session.add_chunk(data)
    else:
        logger.warning(f"Received audio data for unknown session: {sid}")

@socketio.on('stop-recording')
def handle_stop_recording():
    # Get socket ID correctly from Socket.IO
    sid = request.sid if hasattr(request, 'sid') else socketio.sid
    logger.info(f"Stop recording request from {sid}")
    
    if sid in active_sessions:
        session = active_sessions[sid]
        
        # Prevent multiple concurrent transcription processes
        if session.is_processing:
            logger.warning(f"Already processing for session {sid}")
            return
        
        session.is_processing = True
        current_sid = sid  # Store the sid for use in the thread
        
        # Run transcription in a separate thread to avoid blocking
        def process_audio():
            try:
                audio_path = session.stop_recording()
                
                if audio_path:
                    # Transcribe the audio
                    logger.info(f"Transcribing audio for session {current_sid}")
                    result = model.transcribe(audio_path)
                    
                    # Convert to SVG
                    text = result["text"]
                    svg_output = text_to_svg(text)
                    
                    # Send result back to client
                    socketio.emit('transcription-result', {
                        "text": text,
                        "svg": svg_output,
                        "success": True
                    }, room=current_sid)
                    
                    # Clean up
                    session.clean_up()
                else:
                    socketio.emit('transcription-result', {
                        "error": "No audio data received",
                        "success": False
                    }, room=current_sid)
            
            except Exception as e:
                logger.error(f"Error transcribing audio: {str(e)}")
                socketio.emit('transcription-result', {
                    "error": str(e),
                    "success": False
                }, room=current_sid)
            
            finally:
                # Mark processing as complete
                session.is_processing = False
                
                # Clean up the session
                if current_sid in active_sessions:
                    del active_sessions[current_sid]
        
        # Start the processing thread
        threading.Thread(target=process_audio).start()
    else:
        logger.warning(f"Stop recording request for unknown session: {sid}")
        emit('transcription-result', {
            "error": "No active recording session",
            "success": False
        })

@socketio.on('stop-real-time')
def handle_stop_real_time():
    # Get socket ID correctly from Socket.IO
    sid = request.sid if hasattr(request, 'sid') else socketio.sid
    logger.info(f"Stop real-time transcription request from {sid}")
    
    if sid in active_sessions:
        session = active_sessions[sid]
        
        # If real-time mode is active
        if session.real_time_mode:
            # Get the accumulated text
            final_text = session.accumulated_text
            
            # Convert to SVG
            svg_output = text_to_svg(final_text)
            
            # Stop the real-time processing
            session.stop_recording()
            
            # Send final result back to client
            emit('real-time-complete', {
                "text": final_text,
                "svg": svg_output,
                "success": True
            })
            
            # Clean up the session
            session.clean_up()
            del active_sessions[sid]
        else:
            emit('real-time-complete', {
                "error": "Session is not in real-time mode",
                "success": False
            })
    else:
        logger.warning(f"Stop real-time request for unknown session: {sid}")
        emit('real-time-complete', {
            "error": "No active real-time session",
            "success": False
        })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5505))
    
    # Check if SSL certificates are provided for HTTPS
    ssl_context = None
    cert_file = 'ssl/cert.pem'
    key_file = 'ssl/key.pem'
    
    if cert_file and key_file and os.path.exists(cert_file) and os.path.exists(key_file):
        ssl_context = (cert_file, key_file)
        logger.info(f"Starting secure server with SSL on port {port}")
    else:
        logger.info(f"Starting server on port {port} (no SSL)")
        logger.warning("For microphone access in modern browsers, HTTPS is required except on localhost.")
        logger.info("Set SSL_CERT_FILE and SSL_KEY_FILE environment variables to enable HTTPS.")
    
    # Start the server
    socketio.run(app, host='0.0.0.0', port=port, ssl_context=ssl_context, debug=True)