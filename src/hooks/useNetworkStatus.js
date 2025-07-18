import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for monitoring network status and connection quality
 * @returns {Object} Network status information
 */
const useNetworkStatus = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSlowConnection, setIsSlowConnection] = useState(false);
    const [connectionType, setConnectionType] = useState('unknown');
    const [downlink, setDownlink] = useState(null);
    const [effectiveType, setEffectiveType] = useState('unknown');
    const [rtt, setRtt] = useState(null);
    const [saveData, setSaveData] = useState(false);

    // Update network information
    const updateNetworkInfo = useCallback(() => {
        if ('connection' in navigator) {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            
            if (connection) {
                setConnectionType(connection.type || 'unknown');
                setDownlink(connection.downlink || null);
                setEffectiveType(connection.effectiveType || 'unknown');
                setRtt(connection.rtt || null);
                setSaveData(connection.saveData || false);
                
                // Determine if connection is slow
                const slowTypes = ['slow-2g', '2g'];
                const slowDownlink = connection.downlink && connection.downlink < 1; // Less than 1 Mbps
                const highRtt = connection.rtt && connection.rtt > 1000; // More than 1 second RTT
                
                setIsSlowConnection(
                    slowTypes.includes(connection.effectiveType) || 
                    slowDownlink || 
                    highRtt
                );
            }
        }
    }, []);

    // Handle online/offline events
    const handleOnline = useCallback(() => {
        setIsOnline(true);
        updateNetworkInfo();
    }, [updateNetworkInfo]);

    const handleOffline = useCallback(() => {
        setIsOnline(false);
        setIsSlowConnection(false);
    }, []);

    // Handle connection change
    const handleConnectionChange = useCallback(() => {
        updateNetworkInfo();
    }, [updateNetworkInfo]);

    // Speed test function
    const performSpeedTest = useCallback(async () => {
        if (!isOnline) return null;

        try {
            const startTime = performance.now();
            const response = await fetch('/api/health', { 
                method: 'HEAD',
                cache: 'no-cache'
            });
            const endTime = performance.now();
            
            const latency = endTime - startTime;
            
            return {
                latency,
                success: response.ok,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                latency: null,
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }, [isOnline]);

    // Set up event listeners
    useEffect(() => {
        // Update initial state
        updateNetworkInfo();

        // Add event listeners
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Listen for connection changes if available
        if ('connection' in navigator) {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (connection) {
                connection.addEventListener('change', handleConnectionChange);
            }
        }

        // Cleanup
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            
            if ('connection' in navigator) {
                const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
                if (connection) {
                    connection.removeEventListener('change', handleConnectionChange);
                }
            }
        };
    }, [handleOnline, handleOffline, handleConnectionChange, updateNetworkInfo]);

    return {
        isOnline,
        isSlowConnection,
        connectionType,
        downlink,
        effectiveType,
        rtt,
        saveData,
        performSpeedTest,
        
        // Helper methods
        isGoodConnection: !isSlowConnection && isOnline,
        isMobileConnection: ['cellular', '3g', '4g', '5g'].includes(connectionType),
        
        // Connection quality assessment
        getConnectionQuality: () => {
            if (!isOnline) return 'offline';
            if (isSlowConnection) return 'poor';
            if (effectiveType === '4g' || (downlink && downlink > 10)) return 'excellent';
            if (effectiveType === '3g' || (downlink && downlink > 1)) return 'good';
            return 'fair';
        },
        
        // Bandwidth estimation
        getBandwidthEstimate: () => {
            if (!isOnline || !downlink) return null;
            return {
                downlink: downlink,
                unit: 'Mbps',
                quality: downlink > 10 ? 'high' : downlink > 1 ? 'medium' : 'low'
            };
        }
    };
};

export default useNetworkStatus;
