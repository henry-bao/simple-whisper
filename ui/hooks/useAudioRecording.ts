import { useState, useEffect, useRef } from 'react';
import { initializeSocket, getSocket, disconnectSocket } from '@/lib/socket';
import { useServerSettings } from '@/lib/settings-context';

interface UseAudioRecordingResult {
    isRecording: boolean;
    recordingTime: number;
    recordingComplete: boolean;
    transcriptionResult: {
        text: string;
        svg: string;
    } | null;
    startRecording: () => void;
    stopRecording: () => void;
    resetRecording: () => void;
    isProcessing: boolean;
    error: string | null;
    isBackendConfigured: boolean;
}

export const useAudioRecording = (): UseAudioRecordingResult => {
    const { serverSettings } = useServerSettings();
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [recordingTime, setRecordingTime] = useState<number>(0);
    const [recordingComplete, setRecordingComplete] = useState<boolean>(false);
    const [transcriptionResult, setTranscriptionResult] = useState<{ text: string; svg: string } | null>(null);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Float32Array[]>([]);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const socketRef = useRef<ReturnType<typeof getSocket>>(null);
    const isRecordingRef = useRef<boolean>(false); // Use ref for immediate access in audio processor

    const MAX_RECORDING_TIME = 30; // 30 seconds max

    // Sync ref with state
    useEffect(() => {
        isRecordingRef.current = isRecording;
    }, [isRecording]);

    // Initialize socket connection when backend URL changes
    useEffect(() => {
        // Clean up previous connection if exists
        if (socketRef.current) {
            disconnectSocket();
            socketRef.current = null;
        }

        // Only initialize if backend is configured
        if (serverSettings.isConfigured && serverSettings.backendUrl) {
            try {
                socketRef.current = initializeSocket(serverSettings.backendUrl);

                const socket = socketRef.current;

                // Set up socket event listeners
                socket.on('recording-started', (data) => {
                    if (!data.success) {
                        setError('Failed to start recording on the server');
                        setIsRecording(false);
                        isRecordingRef.current = false;
                    }
                });

                socket.on('transcription-result', (data) => {
                    setIsProcessing(false);
                    if (data.success) {
                        setTranscriptionResult({
                            text: data.text,
                            svg: data.svg,
                        });
                    } else {
                        setError(data.error || 'Error processing transcription');
                    }
                });
            } catch (err) {
                console.error('Failed to initialize socket:', err);
                setError('Could not connect to the backend server. Check your settings.');
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }

            // Clean up audio resources
            if (processorNodeRef.current && sourceNodeRef.current && audioContextRef.current) {
                try {
                    sourceNodeRef.current.disconnect();
                    processorNodeRef.current.disconnect();
                    if (audioContextRef.current.state !== 'closed') {
                        audioContextRef.current.close();
                    }
                } catch (e) {
                    console.error('Error cleaning up audio resources:', e);
                }
            }

            disconnectSocket();
        };
    }, [serverSettings.backendUrl, serverSettings.isConfigured]);

    const startRecording = async () => {
        // Prevent recording if backend is not configured
        if (!serverSettings.isConfigured || !serverSettings.backendUrl) {
            setError('Backend server not configured. Please go to Settings to configure the server.');
            return;
        }

        try {
            setError(null);
            audioChunksRef.current = [];

            // Set recording flag first (use ref for immediate effect)
            isRecordingRef.current = true;
            setIsRecording(true);

            // Signal to the server to start a new recording session
            if (socketRef.current) {
                socketRef.current.emit('start-recording');
            } else {
                throw new Error('Socket connection not established');
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Set up audio processing
            audioContextRef.current = new AudioContext({ sampleRate: 16000 });
            sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream);
            processorNodeRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

            processorNodeRef.current.onaudioprocess = (e) => {
                // Use the ref instead of state for immediate access
                if (isRecordingRef.current) {
                    const audioData = e.inputBuffer.getChannelData(0);
                    const audioDataCopy = new Float32Array(audioData);
                    audioChunksRef.current.push(audioDataCopy);

                    // Send audio chunk to server - convert to Array for serialization
                    if (socketRef.current) {
                        try {
                            // Send as regular array for proper serialization over socket.io
                            const audioArray = Array.prototype.slice.call(audioDataCopy);

                            // Debug the first few chunks
                            if (audioChunksRef.current.length < 5) {
                                console.log(
                                    `Sending audio chunk ${audioChunksRef.current.length}`,
                                    `Length: ${audioArray.length}`,
                                    `Sample values: ${audioArray.slice(0, 5)}`
                                );
                            }

                            socketRef.current.emit('audio-data', audioArray);
                        } catch (err) {
                            console.error('Error sending audio chunk:', err);
                        }
                    }
                }
            };

            sourceNodeRef.current.connect(processorNodeRef.current);
            processorNodeRef.current.connect(audioContextRef.current.destination);

            // Also use MediaRecorder for local recording
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();

            setRecordingTime(0);

            // Start timer
            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => {
                    if (prev >= MAX_RECORDING_TIME) {
                        stopRecording();
                        return MAX_RECORDING_TIME;
                    }
                    return prev + 1;
                });
            }, 1000);

            console.log(
                'Recording started successfully. Audio context sample rate:',
                audioContextRef.current.sampleRate
            );
        } catch (error) {
            console.error('Error accessing microphone:', error);
            isRecordingRef.current = false;
            setIsRecording(false);
            setError(
                error instanceof Error
                    ? error.message
                    : 'Could not access your microphone. Please check permissions and try again.'
            );
        }
    };

    const stopRecording = () => {
        console.log('Stopping recording. Chunks collected:', audioChunksRef.current.length);

        if (isRecordingRef.current) {
            // Set flags first to stop audio collection
            isRecordingRef.current = false;
            setIsRecording(false);
            setRecordingComplete(true);

            if (timerRef.current) {
                clearInterval(timerRef.current);
            }

            // Check if we have collected any audio
            if (audioChunksRef.current.length === 0) {
                setError('No audio was recorded. Please try again.');
                return;
            }

            // Signal to the server to stop recording and start transcription
            if (socketRef.current) {
                setIsProcessing(true);
                socketRef.current.emit('stop-recording');
                console.log('Sent stop-recording signal to server');
            } else {
                setError('Lost connection to server');
            }

            // Stop MediaRecorder if it exists
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }

            // Stop all tracks from the media stream
            if (mediaRecorderRef.current?.stream) {
                mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
            }

            // Clean up audio resources
            if (processorNodeRef.current && sourceNodeRef.current) {
                try {
                    sourceNodeRef.current.disconnect();
                    processorNodeRef.current.disconnect();
                } catch (e) {
                    console.error('Error disconnecting audio nodes:', e);
                }
            }
        }
    };

    const resetRecording = () => {
        isRecordingRef.current = false;
        setIsRecording(false);
        setRecordingComplete(false);
        setRecordingTime(0);
        setTranscriptionResult(null);
        setError(null);
        audioChunksRef.current = [];
    };

    return {
        isRecording,
        recordingTime,
        recordingComplete,
        transcriptionResult,
        startRecording,
        stopRecording,
        resetRecording,
        isProcessing,
        error,
        isBackendConfigured: serverSettings.isConfigured,
    };
};
