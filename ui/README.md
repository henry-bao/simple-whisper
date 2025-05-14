# Whisper Transcription UI

This is a Next.js frontend application that connects to a Flask backend for audio recording, transcription, and plotting functionality.

## Getting Started

### Prerequisites

-   Node.js 18+ and npm/pnpm
-   Python with Flask and the dependencies in the main project

### Setup and Running

1. First, start the Flask backend server:

```bash
# From the root directory
python main.py
```

2. Then, in a separate terminal, start the Next.js development server:

```bash
# From the ui directory
pnpm install
pnpm run dev
```

3. Access the application at [http://localhost:3000](http://localhost:3000)

4. Configure the backend server in the Settings page:
    - Go to the Settings page
    - Enter your backend server URL (e.g., `http://localhost:5505`)
    - Click Connect to verify the connection
    - The application will remember your settings for future sessions

## How it Works

This application uses:

1. **Socket.IO** for real-time communication between the browser and Flask server
2. **Web Audio API** for capturing audio in the browser
3. **React** and **Next.js** for the UI
4. **Flask + Whisper** on the backend for audio transcription
5. **AxiDraw** for drawing/plotting the transcribed text

## Development

-   The connection between the UI and Flask is managed through Socket.IO
-   Backend connection settings are stored in localStorage
-   Audio is captured in the browser and sent to Flask in real-time
-   The backend performs transcription and SVG generation
-   The UI displays the results and allows the user to complete the process

## Troubleshooting

### "No audio captured" Error

If you encounter a "No audio captured" error:

1. Check that your microphone is working and properly connected
2. Make sure you have granted microphone permissions to the browser
3. Check the browser console for any errors related to audio recording
4. Ensure the WebSocket connection is established before recording
5. Try a different browser if issues persist (Chrome works best)
6. Check the Flask server logs for more detailed error information

### Connection Issues

If you have problems connecting to the backend:

1. Verify the backend server is running (`python main.py`)
2. Make sure the URL in settings includes the correct protocol and port (e.g., `http://localhost:5505`)
3. Check that there are no firewall issues blocking the connection
4. Look for CORS errors in the browser console
