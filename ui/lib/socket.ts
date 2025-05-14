import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initializeSocket = (backendUrl: string): Socket => {
    if (socket) {
        // If already connected to a different URL, disconnect first
        if (socket.io.uri !== backendUrl) {
            socket.disconnect();
            socket = null;
        } else {
            return socket; // Return existing socket if same URL
        }
    }

    socket = io(backendUrl, {
        transports: ['websocket'],
        autoConnect: true,
    });

    socket.on('connect', () => {
        console.log('Connected to socket server at', backendUrl);
    });

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
    });

    return socket;
};

export const getSocket = (): Socket | null => {
    return socket;
};

export const disconnectSocket = (): void => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
