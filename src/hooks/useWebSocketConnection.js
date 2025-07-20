import { useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';

/**
 * Custom hook for managing WebSocket connections with automatic reconnection and circuit breaker
 * @param {string} url - WebSocket URL
 * @param {Object} options - Configuration options
 * @param {Function} onMessage - Message handler function
 * @param {Function} onOpen - Connection open handler
 * @param {Function} onClose - Connection close handler
 * @param {Function} onError - Error handler
 * @param {number} reconnectDelay - Initial delay before reconnection attempt
 * @param {number} maxReconnectAttempts - Maximum number of reconnection attempts
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
    maxReconnectAttempts = 10,
    pingInterval = 30000,
    enabled = true
}) => {
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const pingIntervalRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const lastConnectionAttemptRef = useRef(0);
    const circuitBreakerRef = useRef({
        isOpen: false,
        failureCount: 0,
        lastFailureTime: 0,
        resetTimeoutRef: null
    });
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

    // Circuit breaker logic to prevent resource exhaustion
    const isCircuitBreakerOpen = useCallback(() => {
        const { isOpen, failureCount, lastFailureTime } = circuitBreakerRef.current;
        
        // Circuit breaker is open for 60 seconds after 5 consecutive failures
        if (isOpen && Date.now() - lastFailureTime > 60000) {
            console.log('[useWebSocketConnection] Circuit breaker reset - attempting to close');
            circuitBreakerRef.current.isOpen = false;
            circuitBreakerRef.current.failureCount = 0;
            return false;
        }
        
        return isOpen;
    }, []);

    const recordConnectionFailure = useCallback(() => {
        circuitBreakerRef.current.failureCount++;
        circuitBreakerRef.current.lastFailureTime = Date.now();
        
        if (circuitBreakerRef.current.failureCount >= 5) {
            console.warn('[useWebSocketConnection] Circuit breaker opened - too many consecutive failures');
            circuitBreakerRef.current.isOpen = true;
        }
    }, []);

    const recordConnectionSuccess = useCallback(() => {
        circuitBreakerRef.current.isOpen = false;
        circuitBreakerRef.current.failureCount = 0;
        reconnectAttemptsRef.current = 0;
    }, []);

    // Calculate exponential backoff delay
    const getReconnectDelay = useCallback(() => {
        const baseDelay = reconnectDelay;
        const exponentialDelay = Math.min(baseDelay * Math.pow(2, reconnectAttemptsRef.current), 30000); // Max 30 seconds
        const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
        return exponentialDelay + jitter;
    }, [reconnectDelay]);

    const connectWebSocket = useCallback(() => {
        if (!enabled || !url) return;

        // Check circuit breaker
        if (isCircuitBreakerOpen()) {
            console.warn('[useWebSocketConnection] Circuit breaker is open - connection attempt blocked');
            return;
        }

        // Check if we've exceeded maximum reconnection attempts
        if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            console.error(`[useWebSocketConnection] Maximum reconnection attempts (${maxReconnectAttempts}) exceeded. Stopping reconnection attempts.`);
            return;
        }

        // Rate limiting: prevent too frequent connection attempts
        const now = Date.now();
        const timeSinceLastAttempt = now - lastConnectionAttemptRef.current;
        const minTimeBetweenAttempts = 1000; // Minimum 1 second between attempts

        if (timeSinceLastAttempt < minTimeBetweenAttempts) {
            console.warn('[useWebSocketConnection] Connection attempt rate limited');
            return;
        }

        lastConnectionAttemptRef.current = now;

        // Generate a unique client ID for this connection
        const clientId = `client_${Math.random().toString(36).substring(2, 15)}`;
        const wsUrl = url.includes('${clientId}') ? url.replace('${clientId}', clientId) : `${url}/${clientId}`;

        console.log(`[useWebSocketConnection] Connecting to WebSocket at: ${wsUrl} (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
        
        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            // Set a connection timeout
            const connectionTimeout = setTimeout(() => {
                if (ws.readyState === WebSocket.CONNECTING) {
                    console.error('[useWebSocketConnection] Connection timeout - closing connection attempt');
                    ws.close();
                    recordConnectionFailure();
                }
            }, 10000); // 10 second timeout

            ws.onopen = (event) => {
                clearTimeout(connectionTimeout);
                console.log('[useWebSocketConnection] WebSocket connection established');
                
                // Reset reconnection attempts and circuit breaker on successful connection
                recordConnectionSuccess();
                
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
                clearTimeout(connectionTimeout);
                console.log('[useWebSocketConnection] WebSocket connection closed', event.code, event.reason);

                // Clear ping interval
                if (pingIntervalRef.current) {
                    clearInterval(pingIntervalRef.current);
                    pingIntervalRef.current = null;
                }

                onClose?.(event);

                // Only attempt to reconnect if the closure wasn't intentional and we haven't exceeded limits
                const shouldReconnect = enabled && 
                                      event.code !== 1000 && // Normal closure
                                      event.code !== 1001 && // Going away
                                      reconnectAttemptsRef.current < maxReconnectAttempts &&
                                      !isCircuitBreakerOpen();

                if (shouldReconnect) {
                    reconnectAttemptsRef.current++;
                    recordConnectionFailure();
                    
                    const delay = getReconnectDelay();
                    console.log(`[useWebSocketConnection] Will attempt to reconnect in ${Math.round(delay)}ms... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
                    
                    reconnectTimeoutRef.current = setTimeout(() => {
                        console.log('[useWebSocketConnection] Attempting to reconnect...');
                        connectWebSocket();
                    }, delay);
                } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
                    console.error('[useWebSocketConnection] Maximum reconnection attempts reached. Please check server status and refresh the page to retry.');
                }
            };

            ws.onerror = (error) => {
                clearTimeout(connectionTimeout);
                console.error('[useWebSocketConnection] WebSocket error:', error);
                recordConnectionFailure();
                onError?.(error);
            };

        } catch (error) {
            console.error('[useWebSocketConnection] Failed to create WebSocket connection:', error);
            recordConnectionFailure();
            onError?.(error);
        }

    }, [url, enabled, onMessage, onOpen, onClose, onError, maxReconnectAttempts, pingInterval, sendPing, isCircuitBreakerOpen, recordConnectionFailure, recordConnectionSuccess, getReconnectDelay]);

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = null;
            }
            wsRef.current.close(1000, 'Client disconnecting'); // Normal closure
            wsRef.current = null;
        }

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        // Reset circuit breaker when manually disconnecting
        if (circuitBreakerRef.current.resetTimeoutRef) {
            clearTimeout(circuitBreakerRef.current.resetTimeoutRef);
            circuitBreakerRef.current.resetTimeoutRef = null;
        }
        circuitBreakerRef.current.isOpen = false;
        circuitBreakerRef.current.failureCount = 0;
        reconnectAttemptsRef.current = 0;
    }, []);

    const forceReconnect = useCallback(() => {
        console.log('[useWebSocketConnection] Force reconnect requested');
        
        // Reset all connection state
        reconnectAttemptsRef.current = 0;
        circuitBreakerRef.current.isOpen = false;
        circuitBreakerRef.current.failureCount = 0;
        
        // Disconnect and reconnect
        disconnect();
        setTimeout(() => {
            connectWebSocket();
        }, 1000);
    }, [disconnect, connectWebSocket]);

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
        forceReconnect,
        connectionState: getConnectionState(),
        isConnected: wsRef.current?.readyState === WebSocket.OPEN,
        reconnectAttempts: reconnectAttemptsRef.current,
        maxReconnectAttempts,
        isCircuitBreakerOpen: isCircuitBreakerOpen(),
        canReconnect: reconnectAttemptsRef.current < maxReconnectAttempts && !isCircuitBreakerOpen()
    };
};

export default useWebSocketConnection;
