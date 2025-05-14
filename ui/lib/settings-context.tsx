'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ServerSettings {
    backendUrl: string | null;
    isConfigured: boolean;
}

interface ServerSettingsContextType {
    serverSettings: ServerSettings;
    setBackendUrl: (url: string) => void;
    resetBackendUrl: () => void;
    validateConnection: () => Promise<boolean>;
}

const ServerSettingsContext = createContext<ServerSettingsContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'whisper_backend_url';

export function ServerSettingsProvider({ children }: { children: ReactNode }) {
    const [serverSettings, setServerSettings] = useState<ServerSettings>({
        backendUrl: null,
        isConfigured: false,
    });

    // Load settings from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedUrl = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedUrl) {
                setServerSettings({
                    backendUrl: savedUrl,
                    isConfigured: true,
                });
            }
        }
    }, []);

    const setBackendUrl = (url: string) => {
        // Save to state and localStorage
        setServerSettings({
            backendUrl: url,
            isConfigured: true,
        });

        if (typeof window !== 'undefined') {
            localStorage.setItem(LOCAL_STORAGE_KEY, url);
        }
    };

    const resetBackendUrl = () => {
        setServerSettings({
            backendUrl: null,
            isConfigured: false,
        });

        if (typeof window !== 'undefined') {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
    };

    const validateConnection = async (): Promise<boolean> => {
        if (!serverSettings.backendUrl) return false;

        try {
            // Try to connect using fetch to check server availability
            const response = await fetch(`${serverSettings.backendUrl}/ping`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                mode: 'cors',
                timeout: 5000,
            });

            return response.ok;
        } catch (error) {
            console.error('Error connecting to backend:', error);
            return false;
        }
    };

    return (
        <ServerSettingsContext.Provider
            value={{
                serverSettings,
                setBackendUrl,
                resetBackendUrl,
                validateConnection,
            }}
        >
            {children}
        </ServerSettingsContext.Provider>
    );
}

export function useServerSettings() {
    const context = useContext(ServerSettingsContext);
    if (context === undefined) {
        throw new Error('useServerSettings must be used within a ServerSettingsProvider');
    }
    return context;
}
