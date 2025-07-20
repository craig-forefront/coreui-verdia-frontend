import React, { useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
    CToast, 
    CToastBody, 
    CToastHeader,
    CToaster,
    CBadge,
    CAlert,
    CButton 
} from '@coreui/react';
import { cilWifiSignal0, cilWifiSignal1, cilWifiSignal4, cilInfo, cilWarning } from '@coreui/icons';
import CIcon from '@coreui/icons-react';

// Redux imports
import {
    updateConnectionStatus,
    addMessage,
    clearMessages,
    updateConnectionMetrics,
    setConnectionPreferences,
    addToMessageHistory,
    setError,
    clearError,
    selectConnectionStatus,
    selectConnectionMetrics,
    selectConnectionPreferences,
    selectMessageHistory,
    selectConnectionError,
    selectUnreadMessages,
    selectIsOnline
} from '../../store/webSocketSlice';

import {
    updateProcessingStatus
} from '../../store/videoSlice';

import {
    setCurrentImage,
    setDetectionError,
    clearImageResults
} from '../../store/imageProcessingSlice';

// Custom hooks
import useWebSocketConnection from '../../hooks/useWebSocketConnection';
import useLocalStorage from '../../hooks/useLocalStorage';
import useNetworkStatus from '../../hooks/useNetworkStatus';

const API_URL = import.meta.env.VITE_API_URL || '';
const WS_URL = API_URL.replace(/^http/, 'ws');

const WebSocketManager = ({
    // Configuration props for flexibility
    enableNotifications = true,
    enableToasts = true,
    enableMetrics = true,
    enableOfflineMode = true,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
    messageQueueSize = 100,
    enableDebugMode = false,
    className = ''
}) => {
    const dispatch = useDispatch();
    const toasterRef = useRef(null);
    const messageQueueRef = useRef([]);
    const lastHeartbeatRef = useRef(null);
    
    // Redux selectors
    const connectionStatus = useSelector(selectConnectionStatus);
    const connectionMetrics = useSelector(selectConnectionMetrics);
    const connectionPreferences = useSelector(selectConnectionPreferences);
    const messageHistory = useSelector(selectMessageHistory);
    const connectionError = useSelector(selectConnectionError);
    const unreadMessages = useSelector(selectUnreadMessages);
    const isOnline = useSelector(selectIsOnline);
    
    // Network status monitoring
    const { isOnline: networkOnline, isSlowConnection } = useNetworkStatus();
    
    // Local preferences with localStorage
    const [localPrefs, setLocalPrefs] = useLocalStorage('webSocketPrefs', {
        enableNotifications: enableNotifications,
        enableToasts: enableToasts,
        enableAutoReconnect: true,
        reconnectDelay: 5000,
        maxReconnectAttempts: maxReconnectAttempts,
        enableHeartbeat: true,
        heartbeatInterval: heartbeatInterval,
        enableMetrics: enableMetrics,
        enableOfflineQueue: enableOfflineMode,
        enableDebugLogging: enableDebugMode,
        messageRetentionLimit: 50,
        enableConnectionHealth: true,
        slowConnectionThreshold: 2000, // ms
        connectionTimeoutThreshold: 10000, // ms
        enableBandwidthOptimization: true
    });

    // Message type handlers with enhanced functionality
    const messageHandlers = {
        // Video processing updates
        video_update: useCallback((data) => {
            if (localPrefs.enableDebugLogging) {
                console.log(`[WebSocketManager] 📹 Video Update:`, data);
            }
            
            dispatch(updateProcessingStatus({
                video_id: data.video_id,
                status: data.status,
                progress: Math.min(Math.max(data.progress || 0, 0), 1),
                face_groups: data.face_groups,
                error: data.error,
                timestamp: new Date().toISOString()
            }));
            
            // Show completion notification
            if (data.status === 'completed' && localPrefs.enableNotifications) {
                showNotification('Video Processing Complete', 
                    `Video ${data.video_id} has been processed successfully`, 'success');
            }
        }, [dispatch, localPrefs.enableDebugLogging, localPrefs.enableNotifications]),
        
        // Image processing updates
        image_update: useCallback((data) => {
            if (localPrefs.enableDebugLogging) {
                console.log(`[WebSocketManager] 🖼️ Image Update:`, data);
            }
            
            dispatch(setCurrentImage({
                id: data.image_id,
                status: data.status,
                progress: Math.min(Math.max(data.progress || 0, 0), 1),
                results: data.results,
                error: data.error,
                timestamp: new Date().toISOString()
            }));
        }, [dispatch, localPrefs.enableDebugLogging]),
        
        // Face detection results
        face_detection_result: useCallback((data) => {
            if (localPrefs.enableDebugLogging) {
                console.log(`[WebSocketManager] 👤 Face Detection Result:`, data);
            }
            
            // Update face processing state
            dispatch(setCurrentImage({
                detection_id: data.detection_id,
                faces: data.faces,
                confidence: data.confidence,
                processing_time: data.processing_time
            }));
            
            // Show notification for face detection
            if (localPrefs.enableNotifications && data.faces?.length > 0) {
                showNotification('Face Detection Complete', 
                    `Found ${data.faces.length} face(s) in the image`, 'info');
            }
        }, [dispatch, localPrefs.enableDebugLogging, localPrefs.enableNotifications]),
        
        // System notifications
        system_notification: useCallback((data) => {
            if (localPrefs.enableDebugLogging) {
                console.log(`[WebSocketManager] 🔔 System Notification:`, data);
            }
            
            showNotification(data.title || 'System Notification', 
                data.message, data.type || 'info');
        }, [localPrefs.enableDebugLogging]),
        
        // Connection health check
        pong: useCallback((data) => {
            lastHeartbeatRef.current = Date.now();
            
            // Update connection metrics
            dispatch(updateConnectionMetrics({
                lastHeartbeat: lastHeartbeatRef.current,
                latency: data.latency || null,
                serverTime: data.server_time || null
            }));
            
            if (localPrefs.enableDebugLogging) {
                console.debug(`[WebSocketManager] 💓 Heartbeat response - Latency: ${data.latency}ms`);
            }
        }, [dispatch, localPrefs.enableDebugLogging]),
        
        // Connection established
        connection_established: useCallback((data) => {
            console.log(`[WebSocketManager] ✅ Connection established - Client ID: ${data.client_id}`);
            
            dispatch(updateConnectionStatus({
                status: 'connected',
                clientId: data.client_id,
                connectedAt: new Date().toISOString(),
                serverInfo: data.server_info || {}
            }));
            
            // Process queued messages if any
            processQueuedMessages();
            
            if (localPrefs.enableNotifications) {
                showNotification('Connection Established', 'Real-time updates are now active', 'success');
            }
        }, [dispatch, localPrefs.enableNotifications]),
        
        // Error messages
        error: useCallback((data) => {
            console.error(`[WebSocketManager] ❌ Server Error:`, data);
            
            dispatch(setError({
                message: data.message || 'WebSocket server error',
                code: data.code,
                timestamp: new Date().toISOString()
            }));
            
            if (localPrefs.enableNotifications) {
                showNotification('Server Error', data.message || 'An error occurred', 'danger');
            }
        }, [dispatch, localPrefs.enableNotifications]),
        
        // Rate limiting warning
        rate_limit: useCallback((data) => {
            console.warn(`[WebSocketManager] ⚠️ Rate limit warning:`, data);
            
            if (localPrefs.enableNotifications) {
                showNotification('Rate Limit Warning', 
                    `Too many requests. Please wait ${data.retry_after || 60} seconds`, 'warning');
            }
        }, [localPrefs.enableNotifications])
    };

    // Enhanced message handler with metrics and history
    const handleMessage = useCallback((data) => {
        const messageTimestamp = new Date().toISOString();
        
        // Add to message history
        dispatch(addToMessageHistory({
            ...data,
            timestamp: messageTimestamp,
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        }));
        
        // Update metrics
        dispatch(updateConnectionMetrics({
            messagesReceived: connectionMetrics.messagesReceived + 1,
            lastMessageAt: messageTimestamp
        }));
        
        // Route to appropriate handler
        const handler = messageHandlers[data.type];
        if (handler) {
            try {
                handler(data);
            } catch (error) {
                console.error(`[WebSocketManager] Error handling message type '${data.type}':`, error);
                dispatch(setError({
                    message: `Failed to process ${data.type} message`,
                    originalError: error.message
                }));
            }
        } else {
            if (localPrefs.enableDebugLogging) {
                console.log(`[WebSocketManager] 📋 Unhandled message type '${data.type}':`, data);
            }
        }
    }, [dispatch, messageHandlers, connectionMetrics.messagesReceived, localPrefs.enableDebugLogging]);

    // Notification system
    const showNotification = useCallback((title, message, type = 'info') => {
        if (!localPrefs.enableNotifications) return;
        
        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: message,
                icon: '/favicon.ico',
                tag: 'websocket-notification'
            });
        }
        
        // Toast notification
        if (localPrefs.enableToasts && toasterRef.current) {
            const toast = (
                <CToast autohide={true} delay={5000} color={type}>
                    <CToastHeader closeButton>
                        <CIcon icon={getIconForType(type)} className="me-2" />
                        <strong className="me-auto">{title}</strong>
                        <small>Just now</small>
                    </CToastHeader>
                    <CToastBody>{message}</CToastBody>
                </CToast>
            );
            
            toasterRef.current.addToast(toast);
        }
    }, [localPrefs.enableNotifications, localPrefs.enableToasts]);

    // Helper function for notification icons
    const getIconForType = (type) => {
        switch (type) {
            case 'success': return cilWifiSignal4;
            case 'warning': return cilWarning;
            case 'danger': return cilWifiSignal0;
            default: return cilInfo;
        }
    };

    // Enhanced WebSocket connection with all features - called early to get the values
    const { 
        isConnected, 
        send, 
        disconnect, 
        reconnect,
        forceReconnect,
        connectionState,
        reconnectAttempts: currentReconnectAttempts,
        maxReconnectAttempts: maxAttempts,
        isCircuitBreakerOpen,
        canReconnect
    } = useWebSocketConnection({
        url: WS_URL,
        onMessage: handleMessage,
        onOpen: useCallback(() => {
            console.log('[WebSocketManager] 🔗 WebSocket connection opened');
            
            dispatch(updateConnectionStatus({
                status: 'connected',
                connectedAt: new Date().toISOString(),
                reconnectAttempts: 0,
                isCircuitBreakerOpen: false
            }));
            
            dispatch(clearError());
        }, [dispatch]),
        onClose: useCallback((event) => {
            console.log(`[WebSocketManager] 🔌 WebSocket connection closed: ${event.code} - ${event.reason}`);
            
            dispatch(updateConnectionStatus({
                status: 'disconnected',
                disconnectedAt: new Date().toISOString(),
                lastCloseCode: event.code,
                lastCloseReason: event.reason
            }));
        }, [dispatch]),
        onError: useCallback((error) => {
            console.error('[WebSocketManager] 💥 WebSocket error:', error);
            
            dispatch(setError({
                message: 'WebSocket connection error',
                error: error.message || 'Unknown error',
                timestamp: new Date().toISOString()
            }));
        }, [dispatch]),
        reconnectDelay: localPrefs.reconnectDelay,
        maxReconnectAttempts: localPrefs.maxReconnectAttempts,
        pingInterval: localPrefs.enableHeartbeat ? localPrefs.heartbeatInterval : 0,
        enabled: networkOnline && localPrefs.enableAutoReconnect
    });

    // Connection event handlers that depend on the hook values
    useEffect(() => {
        // Show success notification if this was a reconnection
        if (isConnected && currentReconnectAttempts > 0) {
            showNotification('Connection Restored', 'WebSocket connection re-established', 'success');
        }
    }, [isConnected, currentReconnectAttempts, showNotification]);

    useEffect(() => {
        // Show notifications based on connection state changes
        if (!isConnected && localPrefs.enableNotifications) {
            if (isCircuitBreakerOpen) {
                showNotification('Connection Failed', 'Too many failed attempts. Please check server status and try again later.', 'danger');
            } else if (currentReconnectAttempts >= maxAttempts) {
                showNotification('Connection Lost', 'Maximum reconnection attempts reached. Please refresh the page.', 'danger');
            } else if (canReconnect && currentReconnectAttempts > 0) {
                showNotification('Connection Lost', `Attempting to reconnect... (${currentReconnectAttempts}/${maxAttempts})`, 'warning');
            }
        }
    }, [isConnected, isCircuitBreakerOpen, currentReconnectAttempts, maxAttempts, canReconnect, localPrefs.enableNotifications, showNotification]);

    // Message queue processing for offline mode
    const processQueuedMessages = useCallback(() => {
        if (messageQueueRef.current.length > 0 && connectionStatus.status === 'connected') {
            console.log(`[WebSocketManager] 📤 Processing ${messageQueueRef.current.length} queued messages`);
            
            messageQueueRef.current.forEach(message => {
                send(message);
            });
            
            messageQueueRef.current = [];
        }
    }, [connectionStatus.status, send]);

    // Enhanced send function with queuing
    const sendMessage = useCallback((message) => {
        if (isConnected) {
            return send(message);
        } else if (localPrefs.enableOfflineQueue) {
            // Queue message for when connection is restored
            if (messageQueueRef.current.length < messageQueueSize) {
                messageQueueRef.current.push({
                    ...message,
                    queuedAt: new Date().toISOString()
                });
                console.log(`[WebSocketManager] 📥 Message queued (${messageQueueRef.current.length}/${messageQueueSize})`);
                return true;
            } else {
                console.warn('[WebSocketManager] Message queue is full, dropping message');
                return false;
            }
        }
        return false;
    }, [isConnected, send, localPrefs.enableOfflineQueue, messageQueueSize]);

    // Connection health monitoring
    useEffect(() => {
        if (!localPrefs.enableConnectionHealth) return;
        
        const healthCheckInterval = setInterval(() => {
            const now = Date.now();
            const lastHeartbeat = lastHeartbeatRef.current;
            
            if (lastHeartbeat && (now - lastHeartbeat) > localPrefs.connectionTimeoutThreshold) {
                console.warn('[WebSocketManager] 💔 Connection health check failed - no heartbeat');
                
                dispatch(setError({
                    message: 'Connection health check failed',
                    type: 'connection_timeout'
                }));
                
                if (localPrefs.enableNotifications) {
                    showNotification('Connection Issue', 'Checking connection health...', 'warning');
                }
            }
        }, localPrefs.heartbeatInterval);
        
        return () => clearInterval(healthCheckInterval);
    }, [dispatch, localPrefs, showNotification]);

    // Network status integration
    useEffect(() => {
        dispatch(updateConnectionStatus({
            networkOnline,
            isSlowConnection,
            networkType: navigator.connection?.effectiveType || 'unknown'
        }));
    }, [dispatch, networkOnline, isSlowConnection]);

    // Request notification permission on mount
    useEffect(() => {
        if (localPrefs.enableNotifications && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, [localPrefs.enableNotifications]);

    // Debug panel for development
    const renderDebugPanel = () => {
        if (!localPrefs.enableDebugLogging) return null;
        
        return (
            <CAlert color="info" className="mb-3">
                <h6>WebSocket Debug Info</h6>
                <div className="d-flex flex-wrap gap-2 mb-2">
                    <CBadge color={isConnected ? 'success' : 'danger'}>
                        <CIcon icon={isConnected ? cilWifiSignal4 : cilWifiSignal0} className="me-1" />
                        {connectionState}
                    </CBadge>
                    <CBadge color="info">
                        Messages: {connectionMetrics.messagesReceived || 0}
                    </CBadge>
                    <CBadge color="secondary">
                        Queue: {messageQueueRef.current.length}
                    </CBadge>
                    <CBadge color="warning">
                        Attempts: {currentReconnectAttempts}/{maxAttempts}
                    </CBadge>
                    {isCircuitBreakerOpen && (
                        <CBadge color="danger">Circuit Breaker Open</CBadge>
                    )}
                    {isSlowConnection && (
                        <CBadge color="warning">Slow Connection</CBadge>
                    )}
                </div>
                <div className="d-flex gap-2">
                    <CButton size="sm" color="outline-primary" onClick={forceReconnect}>
                        Force Reconnect
                    </CButton>
                    <CButton size="sm" color="outline-secondary" onClick={() => dispatch(clearMessages())}>
                        Clear History
                    </CButton>
                </div>
            </CAlert>
        );
    };

    // Expose methods for external components
    useEffect(() => {
        // Attach methods to window for debugging
        if (localPrefs.enableDebugLogging && typeof window !== 'undefined') {
            window.webSocketManager = {
                send: sendMessage,
                disconnect,
                reconnect,
                forceReconnect,
                getStatus: () => ({
                    ...connectionStatus,
                    reconnectAttempts: currentReconnectAttempts,
                    maxReconnectAttempts: maxAttempts,
                    isCircuitBreakerOpen,
                    canReconnect
                }),
                getMetrics: () => connectionMetrics,
                clearQueue: () => { messageQueueRef.current = []; },
                resetConnection: () => {
                    disconnect();
                    setTimeout(forceReconnect, 1000);
                }
            };
        }
    }, [sendMessage, disconnect, reconnect, forceReconnect, connectionStatus, connectionMetrics, localPrefs.enableDebugLogging, currentReconnectAttempts, maxAttempts, isCircuitBreakerOpen, canReconnect]);

    return (
        <>
            {/* Debug Panel */}
            {renderDebugPanel()}
            
            {/* Toast Container */}
            {localPrefs.enableToasts && (
                <CToaster ref={toasterRef} placement="top-end" />
            )}
            
            {/* Enhanced Connection Status Indicator */}
            {!isConnected && (
                <CAlert 
                    color={isCircuitBreakerOpen ? 'danger' : (canReconnect ? 'warning' : 'danger')} 
                    className="d-flex align-items-center justify-content-between"
                >
                    <div className="d-flex align-items-center">
                        <CIcon icon={cilWifiSignal0} className="me-2" />
                        <div>
                            {isCircuitBreakerOpen ? (
                                <>
                                    <strong>Connection Blocked</strong>
                                    <div className="small">Too many failed attempts. Server may be unavailable.</div>
                                </>
                            ) : currentReconnectAttempts >= maxAttempts ? (
                                <>
                                    <strong>Connection Failed</strong>
                                    <div className="small">Maximum reconnection attempts reached ({currentReconnectAttempts}/{maxAttempts})</div>
                                </>
                            ) : canReconnect ? (
                                <>
                                    <strong>Reconnecting...</strong>
                                    <div className="small">Attempt {currentReconnectAttempts + 1} of {maxAttempts}</div>
                                </>
                            ) : (
                                <>
                                    <strong>Connection Lost</strong>
                                    <div className="small">Real-time updates are unavailable</div>
                                </>
                            )}
                        </div>
                    </div>
                    
                    {/* Manual reconnection button when automatic reconnection is exhausted */}
                    {(currentReconnectAttempts >= maxAttempts || isCircuitBreakerOpen) && (
                        <CButton 
                            size="sm" 
                            color="primary" 
                            variant="outline"
                            onClick={forceReconnect}
                        >
                            Retry Connection
                        </CButton>
                    )}
                </CAlert>
            )}
        </>
    );
};

export default WebSocketManager;
