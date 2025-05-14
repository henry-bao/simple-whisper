'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Wifi, AlertCircle, CheckCircle2, Moon, Sun, Monitor } from 'lucide-react';
import { useServerSettings } from '@/lib/settings-context';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import PageTransition from '@/components/page-transition';

export default function SettingsPage() {
    const { serverSettings, setBackendUrl, resetBackendUrl, validateConnection } = useServerSettings();
    const [backendUrlInput, setBackendUrlInput] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();

    // Initialize form with current settings
    useEffect(() => {
        if (serverSettings.backendUrl) {
            setBackendUrlInput(serverSettings.backendUrl);
            checkConnection(serverSettings.backendUrl);
        }
    }, [serverSettings.backendUrl]);

    const checkConnection = async (url: string) => {
        setIsLoading(true);
        try {
            const isValid = await validateConnection();
            setIsConnected(isValid);
            setIsLoading(false);
            return isValid;
        } catch (error) {
            setIsConnected(false);
            setIsLoading(false);
            return false;
        }
    };

    const handleConnect = async () => {
        if (!backendUrlInput.trim()) {
            toast({
                title: 'Error',
                description: 'Please enter a valid URL',
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);

        // Validate URL format
        try {
            new URL(backendUrlInput); // Will throw if invalid URL
        } catch (error) {
            toast({
                title: 'Invalid URL',
                description: 'Please enter a valid URL including protocol (e.g., http://localhost:5505)',
                variant: 'destructive',
            });
            setIsLoading(false);
            return;
        }

        // Try to connect
        try {
            // Save the URL regardless of connection status
            setBackendUrl(backendUrlInput);

            // Check if it's actually connectable
            const success = await checkConnection(backendUrlInput);

            if (success) {
                toast({
                    title: 'Connected',
                    description: 'Successfully connected to the backend server',
                });
            } else {
                toast({
                    title: 'Connection Warning',
                    description: "Saved the URL, but couldn't establish a connection. Recording features may not work.",
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Connection Error',
                description: 'Failed to connect to the server. Please check the URL and try again.',
                variant: 'destructive',
            });
        }

        setIsLoading(false);
    };

    const handleDisconnect = () => {
        resetBackendUrl();
        setBackendUrlInput('');
        setIsConnected(false);
        toast({
            title: 'Disconnected',
            description: 'Backend server settings have been removed',
        });
    };

    return (
        <PageTransition>
            <main className="min-h-screen p-6">
                <Card className="w-full max-w-md p-6 shadow-lg mx-auto">
                    <div className="flex items-center space-x-2 mb-6">
                        <Settings className="h-5 w-5" />
                        <h1 className="text-2xl font-bold font-happy-monkey">Settings</h1>
                    </div>

                    <Tabs defaultValue="connection">
                        <TabsList className="grid w-full grid-cols-3 mb-6 dark:bg-gray-800 dark:text-white">
                            <TabsTrigger value="connection">Connection</TabsTrigger>
                            <TabsTrigger value="appearance">Appearance</TabsTrigger>
                            <TabsTrigger value="about">About</TabsTrigger>
                        </TabsList>

                        <TabsContent value="connection" className="space-y-6">
                            {!serverSettings.isConfigured && (
                                <Alert variant="destructive" className="mb-4">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Not Configured</AlertTitle>
                                    <AlertDescription>
                                        Please configure and connect to a backend server to use recording features.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {serverSettings.isConfigured && isConnected && (
                                <Alert className="mb-4 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                                    <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" />
                                    <AlertTitle className="text-green-700 dark:text-green-400">Connected</AlertTitle>
                                    <AlertDescription className="text-green-700 dark:text-green-400">
                                        Connected to backend server at {serverSettings.backendUrl}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="backend-url">Backend Server URL</Label>
                                    <Input
                                        id="backend-url"
                                        value={backendUrlInput}
                                        onChange={(e) => setBackendUrlInput(e.target.value)}
                                        placeholder="e.g., http://localhost:5505"
                                    />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Include the protocol (http:// or https://) and port if needed
                                    </p>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Wifi
                                            className={`h-4 w-4 ${
                                                isConnected
                                                    ? 'text-green-500'
                                                    : isLoading
                                                    ? 'text-amber-500'
                                                    : 'text-gray-400'
                                            }`}
                                        />
                                        <span>
                                            {isLoading ? 'Checking...' : isConnected ? 'Connected' : 'Disconnected'}
                                        </span>
                                    </div>

                                    {serverSettings.isConfigured ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleDisconnect}
                                            disabled={isLoading}
                                        >
                                            Remove
                                        </Button>
                                    ) : (
                                        <Button size="sm" onClick={handleConnect} disabled={isLoading}>
                                            {isLoading ? 'Connecting...' : 'Connect'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="appearance" className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium font-happy-monkey">Theme Settings</h3>

                                <div className="space-y-4">
                                    <RadioGroup
                                        value={theme}
                                        onValueChange={setTheme}
                                        className="flex flex-col space-y-3"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="light" id="theme-light" />
                                            <Label
                                                htmlFor="theme-light"
                                                className="flex items-center gap-2 cursor-pointer"
                                            >
                                                <Sun className="h-4 w-4" />
                                                <span>Light</span>
                                            </Label>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="dark" id="theme-dark" />
                                            <Label
                                                htmlFor="theme-dark"
                                                className="flex items-center gap-2 cursor-pointer"
                                            >
                                                <Moon className="h-4 w-4" />
                                                <span>Dark</span>
                                            </Label>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="system" id="theme-system" />
                                            <Label
                                                htmlFor="theme-system"
                                                className="flex items-center gap-2 cursor-pointer"
                                            >
                                                <Monitor className="h-4 w-4" />
                                                <span>System</span>
                                            </Label>
                                        </div>
                                    </RadioGroup>

                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Choose your preferred theme, or use your system settings.
                                    </p>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="about" className="space-y-4">
                            <div>
                                <h3 className="text-lg font-medium font-happy-monkey mb-2">How It Works</h3>
                                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                                    <li>1. Record your audio message</li>
                                    <li>2. The server transcribes it using OpenAI's Whisper model</li>
                                    <li>3. The text is converted to an SVG file</li>
                                    <li>4. The SVG is sent to the AxiDraw plotter</li>
                                    <li>5. The plotter draws your message on paper</li>
                                </ul>
                            </div>
                        </TabsContent>
                    </Tabs>
                </Card>
            </main>
        </PageTransition>
    );
}
