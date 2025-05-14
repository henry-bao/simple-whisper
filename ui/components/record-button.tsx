'use client';

import { motion } from 'framer-motion';

interface RecordButtonProps {
    isRecording: boolean;
    onClick: () => void;
    disabled?: boolean;
}

export default function RecordButton({ isRecording, onClick, disabled = false }: RecordButtonProps) {
    return (
        <motion.button
            onClick={onClick}
            disabled={disabled}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 ${
                isRecording ? 'bg-red-500' : 'bg-primary'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            whileTap={{ scale: disabled ? 1 : 0.95 }}
            whileHover={{ scale: disabled ? 1 : 1.05 }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            {isRecording ? (
                <motion.span
                    className="w-6 h-6 bg-white rounded-sm"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                />
            ) : (
                <motion.svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-8 w-8"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                >
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                </motion.svg>
            )}

            {isRecording && (
                <motion.div
                    className="absolute -inset-1 rounded-full border-2 border-red-500 opacity-75"
                    animate={{ scale: [1, 1.1, 1], opacity: [1, 0.8, 1] }}
                    transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                />
            )}
        </motion.button>
    );
}
