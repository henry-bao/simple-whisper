'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { StopCircle, AlertCircle, Settings } from 'lucide-react';
import PageTransition from '@/components/page-transition';
import EnhancedAudioWaveform from '@/components/enhanced-audio-waveform';
import RecordButton from '@/components/record-button';
import Tooltip from '@/components/tooltip';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function HomePage() {
    const {
        isRecording,
        recordingTime,
        recordingComplete,
        transcriptionResult,
        startRecording,
        stopRecording,
        resetRecording,
        isProcessing,
        error,
        isBackendConfigured,
    } = useAudioRecording();

    const router = useRouter();
    const MAX_RECORDING_TIME = 30; // 30 seconds max

    const handleSubmit = () => {
        if (transcriptionResult) {
            router.push('/transcription');
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <PageTransition>
            <div className="flex flex-col min-h-screen pb-20">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-medium font-happy-monkey">Record Your Message</h1>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push('/settings')}
                            className="flex items-center gap-1"
                        >
                            <Settings className="h-4 w-4" />
                            Settings
                        </Button>
                    </div>

                    {!isBackendConfigured && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Backend Not Configured</AlertTitle>
                            <AlertDescription>
                                Please configure the backend server in the{' '}
                                <Button variant="link" className="h-auto p-0" onClick={() => router.push('/settings')}>
                                    Settings Page
                                </Button>{' '}
                                before recording.
                            </AlertDescription>
                        </Alert>
                    )}

                    <motion.div
                        className="bg-white dark:bg-gray-800 rounded-lg border border-secondary dark:border-gray-700 p-6 mb-6 shadow-sm"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                    >
                        <AnimatePresence mode="wait">
                            {isRecording ? (
                                <motion.div
                                    key="recording"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="space-y-6"
                                >
                                    <p className="text-center text-gray-600 dark:text-gray-300 mb-2">
                                        Recording in progress... Speak clearly into your microphone.
                                    </p>

                                    <EnhancedAudioWaveform isRecording={true} />

                                    <div className="flex flex-col items-center">
                                        <motion.div
                                            className="text-2xl font-medium text-primary mb-4"
                                            animate={{ scale: [1, 1.05, 1] }}
                                            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                                        >
                                            {formatTime(recordingTime)}
                                        </motion.div>

                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                            Maximum recording time: {formatTime(MAX_RECORDING_TIME)}
                                        </p>

                                        <Tooltip content="Stop recording">
                                            <Button
                                                variant="destructive"
                                                size="lg"
                                                className="rounded-full w-16 h-16 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                                                onClick={stopRecording}
                                            >
                                                <StopCircle className="h-8 w-8" />
                                            </Button>
                                        </Tooltip>
                                    </div>
                                </motion.div>
                            ) : recordingComplete ? (
                                <motion.div
                                    key="complete"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="space-y-6"
                                >
                                    {isProcessing ? (
                                        <div className="flex flex-col items-center py-8">
                                            <div className="mb-4">
                                                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                            <p className="text-center text-gray-600 dark:text-gray-300">
                                                Processing your audio... This may take a moment.
                                            </p>
                                        </div>
                                    ) : transcriptionResult ? (
                                        <div className="space-y-6">
                                            <div className="bg-secondary/20 dark:bg-gray-700/30 p-4 rounded-lg">
                                                <h3 className="text-lg font-semibold mb-2">Transcription:</h3>
                                                <p className="text-gray-700 dark:text-gray-300">
                                                    {transcriptionResult.text}
                                                </p>
                                            </div>

                                            <div className="flex justify-center space-x-4 mt-6">
                                                <Button variant="outline" onClick={resetRecording}>
                                                    Record Again
                                                </Button>
                                                <Button onClick={() => router.push('/complete')}>Complete</Button>
                                            </div>
                                        </div>
                                    ) : error ? (
                                        <div className="space-y-6">
                                            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                                                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
                                                    Error:
                                                </h3>
                                                <p className="text-red-700 dark:text-red-300">{error}</p>
                                            </div>
                                            <div className="flex justify-center">
                                                <Button onClick={resetRecording}>Try Again</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-center">
                                            <Button onClick={resetRecording}>Record Again</Button>
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="start"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="space-y-6"
                                >
                                    <p className="text-center text-gray-600 dark:text-gray-300 mb-4">
                                        Speak clearly into your microphone. You can record up to{' '}
                                        {formatTime(MAX_RECORDING_TIME)}.
                                    </p>

                                    <div className="flex flex-col items-center justify-center">
                                        <motion.div
                                            className="mb-8 text-center"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                        >
                                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                                Press the button to start recording
                                            </p>

                                            <div className="flex justify-center">
                                                <RecordButton
                                                    isRecording={false}
                                                    onClick={startRecording}
                                                    disabled={!isBackendConfigured}
                                                />
                                            </div>

                                            {!isBackendConfigured && (
                                                <p className="text-amber-600 mt-4 text-sm">
                                                    Backend server not configured. Recording disabled.
                                                </p>
                                            )}
                                        </motion.div>

                                        <motion.div
                                            className="bg-secondary/50 dark:bg-gray-700/50 p-4 rounded-lg max-w-md mx-auto"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.4 }}
                                        >
                                            <h3 className="font-happy-monkey text-sm font-medium mb-2">
                                                Tips for best results:
                                            </h3>
                                            <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1 list-disc pl-4">
                                                <li>Find a quiet environment with minimal background noise</li>
                                                <li>Speak clearly and at a moderate pace</li>
                                                <li>Keep your device about 6-12 inches from your mouth</li>
                                            </ul>
                                        </motion.div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>
        </PageTransition>
    );
}
