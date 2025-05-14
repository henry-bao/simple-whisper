'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';

interface EnhancedAudioWaveformProps {
    isRecording: boolean;
}

export default function EnhancedAudioWaveform({ isRecording }: EnhancedAudioWaveformProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { theme, resolvedTheme } = useTheme();

    const isDarkTheme = theme === 'dark' || resolvedTheme === 'dark';

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas dimensions
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        // Animation variables
        let animationId: number;
        const waveWidth = canvas.width;
        const waveHeight = canvas.height / 2;
        const barCount = 50;
        const barWidth = 4;
        const barGap = 2;

        // Colors based on theme
        const isDark = isDarkTheme;
        const barColor = isDark ? '#4361ee' : '#092de5'; // Theme blue
        const flatLineColor = isDark ? '#444444' : '#d1d5db';
        const gradientStart = isDark ? '#4361ee' : '#092de5';
        const gradientEnd = isDark ? '#6f86ff' : '#4361ee';

        // Function to draw the waveform
        const drawWave = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (!isRecording) {
                // Draw a flat line when not recording
                ctx.beginPath();
                ctx.moveTo(0, waveHeight);
                ctx.lineTo(canvas.width, waveHeight);
                ctx.strokeStyle = flatLineColor;
                ctx.lineWidth = 2;
                ctx.stroke();
                return;
            }

            for (let i = 0; i < barCount; i++) {
                const x = i * (barWidth + barGap) + (canvas.width - barCount * (barWidth + barGap)) / 2;

                // More dynamic wave pattern with multiple frequencies
                const time = Date.now() * 0.001;
                const height =
                    Math.abs(
                        Math.sin(i * 0.2 + time * 3) * 0.3 +
                            Math.sin(i * 0.1 + time * 2) * 0.2 +
                            Math.sin(i * 0.05 + time * 5) * 0.1
                    ) *
                        canvas.height *
                        0.6 +
                    5;

                const y = waveHeight - height / 2;

                // Add gradient effect
                const gradient = ctx.createLinearGradient(x, y, x, y + height);
                gradient.addColorStop(0, gradientStart);
                gradient.addColorStop(1, gradientEnd);

                ctx.fillStyle = gradient;
                ctx.fillRect(x, y, barWidth, height);
            }

            animationId = requestAnimationFrame(drawWave);
        };

        // Start animation
        drawWave();

        // Cleanup
        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [isRecording, isDarkTheme]);

    return (
        <motion.div
            className="w-full h-32 bg-secondary dark:bg-gray-800 rounded-lg overflow-hidden border border-secondary dark:border-gray-700"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
        >
            <canvas ref={canvasRef} className="w-full h-full" />
            {isRecording && (
                <motion.div
                    className="flex justify-center mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                >
                    <div className="px-3 py-1 bg-primary text-white text-xs rounded-full">Recording...</div>
                </motion.div>
            )}
        </motion.div>
    );
}
