import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

const BACKEND_URL = import.meta.env.VITE_WS_URL || '';
const HEALTH_ENDPOINT = `${BACKEND_URL}/health`;
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useHealthCheck() {
    const isFirstCheck = useRef(true);

    useEffect(() => {
        if (!BACKEND_URL) return;

        let timeoutId: ReturnType<typeof setTimeout>;

        const checkHealth = async () => {
            try {
                const startTime = Date.now();
                const response = await fetch(HEALTH_ENDPOINT);
                const duration = Date.now() - startTime;

                if (response.ok) {
                    // If the first check took longer than 3 seconds, it means the server likely spun up from sleep.
                    if (isFirstCheck.current && duration > 3000) {
                        toast.success('Backend server is awake and ready!');
                    }
                } else {
                    console.warn('[HealthCheck] Backend returned non-200 status:', response.status);
                    if (isFirstCheck.current) {
                        toast.error('Backend server might be down or unreachable.');
                    }
                }
            } catch (error) {
                console.error('[HealthCheck] Error pinging backend:', error);
                if (isFirstCheck.current) {
                    // On free render, an initial fetch might throw a network error while awakening the container
                    toast.info('Waking up backend server (this may take up to 50 seconds)...', {
                        duration: 10000,
                    });
                }
            } finally {
                isFirstCheck.current = false;
                // Schedule the next check
                timeoutId = setTimeout(checkHealth, POLL_INTERVAL_MS);
            }
        };

        // Initiate the first check
        checkHealth();

        return () => {
            clearTimeout(timeoutId);
        };
    }, []);
}
