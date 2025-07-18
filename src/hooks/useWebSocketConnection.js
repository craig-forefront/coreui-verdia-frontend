import { useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';

/**
 * Custom hook for managing WebSocket connections with automatic reconnection
 * @param {string} url - WebSocket URL
 * @param {Object} options - Configuration options
 * @param {Function} onMessage - Message handler function
 * @param {Function} onOpen - Connection open handler
 * @param {Function} onClose - Connection close handler
 * @param {Function} onError - Error handler
 * @param {number} reconnectDelay - Delay before reconnection attempt
 * @param {number} pingInterval - Interval for sending ping messages
 * @returns {Object} - WebSocket connection state and methods
 */
const useWebSocketConnection = ({
    url,
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectDelay = 5000,
    pingInterval = 30000,
    enabled = true
}) => {
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const pingIntervalRef = useRef(null);
    const dispatch = useDispatch();

    const sendMessage = useCallback((message) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(typeof message === 'string' ? message : JSON.stringify(message));
            return true;
        }
        console.warn('[useWebSocketConnection] Cannot send message: WebSocket is not open');
        return false;
    }, []);

    const sendPing = useCallback(() => {
        return sendMessage({ type: 'ping' });
    }, [sendMessage]);

    const connectWebSocket = useCallback(() => {
        if (!enabled || !url) return;

        // Generate a unique client ID for this connection
        const clientId = `client_${Math.random().toString(36).substring(2, 15)}`;
        const wsUrl = url.includes('${clientId}') ? url.replace('${clientId}', clientId) : `${url}/${clientId}`;

        console.log(`[useWebSocketConnection] Connecting to WebSocket at: ${wsUrl}`);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = (event) => {
            console.log('[useWebSocketConnection] WebSocket connection established');
            
            // Clear any reconnection timeout
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }

            // Set up ping interval
            if (pingInterval > 0) {
                pingIntervalRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        console.log('[useWebSocketConnection] Sending ping to keep connection alive');
                        sendPing();
                    } else {
                        clearInterval(pingIntervalRef.current);
                    }
                }, pingInterval);
            }

            onOpen?.(event);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Handle built-in message types
                if (data.type === 'pong') {
                    console.debug('[useWebSocketConnection] Received pong response');
                    return;
                } else if (data.type === 'connection_established') {
                    console.log('[useWebSocketConnection] Connection established with server. Client ID:', data.client_id);
                    return;
                } else if (data.type === 'echo') {
                    console.debug('[useWebSocketConnection] Echo received from server:', data.data);
                    return;
                }

                onMessage?.(data, event);
            } catch (error) {
                console.error('[useWebSocketConnection] Error parsing WebSocket message:', error, event.data);
                onError?.(error);
            }
        };

        ws.onclose = (event) => {
            console.log('[useWebSocketConnection] WebSocket connection closed', event.code, event.reason);

            // Clear ping interval
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = null;
            }

            onClose?.(event);

            // Attempt to reconnect after a delay if enabled
            if (enabled && reconnectDelay > 0) {
                console.log(`[useWebSocketConnection] Will attempt to reconnect in ${reconnectDelay}ms...`);
                reconnectTimeoutRef.current = setTimeout(() => {
                    console.log('[useWebSocketConnection] Attempting to reconnect...');
                    connectWebSocket();
                }, reconnectDelay);
            }
        };

        ws.onerror = (error) => {
            console.error('[useWebSocketConnection] WebSocket error:', error);
            onError?.(error);
        };

    }, [url, enabled, onMessage, onOpen, onClose, onError, reconnectDelay, pingInterval, sendPing]);

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = null;
            }
            wsRef.current.close();
            wsRef.current = null;
        }

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
    }, []);

    const getConnectionState = useCallback(() => {
        if (!wsRef.current) return 'CLOSED';
        
        switch (wsRef.current.readyState) {
            case WebSocket.CONNECTING: return 'CONNECTING';
            case WebSocket.OPEN: return 'OPEN';
            case WebSocket.CLOSING: return 'CLOSING';
            case WebSocket.CLOSED: return 'CLOSED';
            default: return 'UNKNOWN';
        }
    }, []);

    useEffect(() => {
        if (enabled) {
            connectWebSocket();
        }

        return () => {
            disconnect();
        };
    }, [enabled, connectWebSocket, disconnect]);

    return {
        sendMessage,
        sendPing,
        disconnect,
        reconnect: connectWebSocket,
        connectionState: getConnectionState(),
        isConnected: wsRef.current?.readyState === WebSocket.OPEN
    };
};

export default useWebSocketConnection;
