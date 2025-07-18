import { useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { updateProcessingStatus } from '../store/videoSlice';

const API_URL = import.meta.env.VITE_API_URL || '';
// Convert http/https to ws/wss
const WS_URL = API_URL.replace(/^http/, 'ws');

const WebSocketManager = () => {
    const dispatch = useDispatch();
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    const connectWebSocket = useCallback(() => {
        // Generate a unique client ID for this connection
        const clientId = `client_${Math.random().toString(36).substring(2, 15)}`;
        const wsUrl = `${WS_URL}/ws/${clientId}`;

        console.log(`[WebSocketManager] Connecting to WebSocket at: ${wsUrl}`);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('[WebSocketManager] WebSocket connection established');
            // Clear any reconnection timeout
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }

            // Send a ping every 30 seconds to keep the connection alive
            const pingInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    console.log('[WebSocketManager] Sending ping to keep connection alive');
                    ws.send(JSON.stringify({ type: 'ping' }));
                } else {
                    clearInterval(pingInterval);
                }
            }, 30000);

            // Store the interval to clear it when the component unmounts
            wsRef.current.pingInterval = pingInterval;
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Add more detailed debug information
                if (data.type === 'video_update') {
                    console.log('----------------------------');
                    console.log(`[WebSocketManager] ✅ PROGRESS UPDATE RECEIVED`);
                    console.log(`Video ID: ${data.video_id}`);
                    console.log(`Status: ${data.status}`);
                    console.log(`Progress: ${data.progress} (${Math.round(data.progress * 100)}%)`);
                    if (data.face_groups) {
                        console.log(`Face Groups: ${data.face_groups.length} groups included`);
                    }
                    console.log('----------------------------');
                } else {
                    console.log('[WebSocketManager] Received WebSocket message:', data);
                }

                // Handle different message types
                if (data.type === 'video_update') {
                    // Enhanced logging for completion status
                    if (data.status === 'completed') {
                        console.log('[WebSocketManager] Received COMPLETED status for video:', data.video_id);
                        console.log('[WebSocketManager] Face groups received:', data.face_groups);
                        
                        // Make sure the face_groups data is valid before updating state
                        if (data.face_groups && Array.isArray(data.face_groups)) {
                            // Dispatch with complete data for final state update
                            console.log('[WebSocketManager] Dispatching completion update to Redux...');
                            dispatch(updateProcessingStatus({
                                video_id: data.video_id,
                                status: 'completed',
                                progress: 1.0,
                                face_groups: data.face_groups,
                                error: null
                            }));
                            console.log('[WebSocketManager] Dispatched completed status update to Redux');
                        } else {
                            console.warn('[WebSocketManager] Received completed status but face_groups is invalid:', data.face_groups);
                            dispatch(updateProcessingStatus({
                                video_id: data.video_id,
                                status: 'completed',
                                progress: 1.0,
                                error: 'No valid face groups data received'
                            }));
                        }
                        return; // Skip the generic dispatch for completion status
                    }

                    // Ensure 'progress' is treated as a number between 0 and 1
                    if (typeof data.progress === 'number') {
                        // Make sure we dispatch with full data
                        console.log(`[WebSocketManager] 📊 Dispatching progress update for video ${data.video_id}: ${data.status} - ${data.progress * 100}%`);
                        dispatch(updateProcessingStatus({
                            video_id: data.video_id,
                            status: data.status,
                            progress: Math.min(Math.max(data.progress, 0), 1), // Clamp between 0 and 1
                            face_groups: data.face_groups,
                            error: data.error
                        }));
                        console.log('[WebSocketManager] Redux state update dispatched');
                    } else {
                        console.warn('[WebSocketManager] ❌ Invalid progress value in WebSocket message:', data.progress);
                        // Still dispatch with default progress
                        dispatch(updateProcessingStatus({
                            ...data,
                            progress: 0.5 // Default value
                        }));
                    }
                } else if (data.type === 'pong') {
                    // Handle pong response if needed
                    console.debug('[WebSocketManager] Received pong response');
                } else if (data.type === 'connection_established') {
                    // Handle connection established message
                    console.log('[WebSocketManager] Connection established with server. Client ID:', data.client_id);
                } else if (data.type === 'echo') {
                    // Handle echo messages from server
                    console.debug('[WebSocketManager] Echo received from server:', data.data);
                } else {
                    console.log('[WebSocketManager] Unhandled WebSocket message type:', data.type);
                }
            } catch (error) {
                console.error('[WebSocketManager] Error parsing WebSocket message:', error, event.data);
            }
        };

        ws.onclose = (event) => {
            console.log('[WebSocketManager] WebSocket connection closed', event.code, event.reason);

            // Clear ping interval if it exists
            if (wsRef.current && wsRef.current.pingInterval) {
                clearInterval(wsRef.current.pingInterval);
            }

            // Attempt to reconnect after a delay
            console.log('[WebSocketManager] Will attempt to reconnect in 5 seconds...');
            reconnectTimeoutRef.current = setTimeout(() => {
                console.log('[WebSocketManager] Attempting to reconnect...');
                connectWebSocket();
            }, 5000);
        };

        ws.onerror = (error) => {
            console.error('[WebSocketManager] WebSocket error:', error);
        };

    }, [dispatch]);

    useEffect(() => {
        console.log('[WebSocketManager] Component mounted, connecting to WebSocket...');
        connectWebSocket();

        // Clean up the WebSocket connection when the component unmounts
        return () => {
            console.log('[WebSocketManager] Component unmounting, cleaning up WebSocket connection');
            if (wsRef.current) {
                if (wsRef.current.pingInterval) {
                    clearInterval(wsRef.current.pingInterval);
                }
                wsRef.current.close();
                wsRef.current = null;
            }

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };
    }, [connectWebSocket]);

    // This component doesn't render anything
    return null;
};

export default WebSocketManager;