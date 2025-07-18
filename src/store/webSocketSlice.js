import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunk for testing WebSocket connection
export const testConnection = createAsyncThunk(
    'webSocket/testConnection',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch('/api/websocket/health');
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Connection test failed');
            }
            
            return {
                status: 'healthy',
                latency: data.latency || null,
                serverInfo: data.server_info || {},
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return rejectWithValue(error.message || 'Connection test failed');
        }
    }
);

// Async thunk for WebSocket reconnection
export const reconnectWebSocket = createAsyncThunk(
    'webSocket/reconnect',
    async (options = {}, { getState, rejectWithValue }) => {
        try {
            const state = getState();
            const currentAttempts = state.webSocket.connectionStatus.reconnectAttempts || 0;
            const maxAttempts = options.maxAttempts || 5;
            
            if (currentAttempts >= maxAttempts) {
                throw new Error(`Maximum reconnection attempts (${maxAttempts}) exceeded`);
            }
            
            // Simulate reconnection attempt
            return {
                attempt: currentAttempts + 1,
                timestamp: new Date().toISOString(),
                success: true
            };
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Initial state
const initialState = {
    // Connection status and info
    connectionStatus: {
        status: 'disconnected', // 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'
        clientId: null,
        connectedAt: null,
        disconnectedAt: null,
        lastCloseCode: null,
        lastCloseReason: null,
        reconnectAttempts: 0,
        networkOnline: true,
        isSlowConnection: false,
        networkType: 'unknown'
    },
    
    // Connection metrics and performance
    connectionMetrics: {
        messagesReceived: 0,
        messagesSent: 0,
        lastMessageAt: null,
        lastHeartbeat: null,
        averageLatency: null,
        connectionUptime: 0,
        totalReconnections: 0,
        dataTransferred: 0,
        errorCount: 0,
        lastErrorAt: null
    },
    
    // Message history and management
    messageHistory: [],
    unreadMessages: 0,
    messageFilter: {
        types: [], // Filter by message types
        dateRange: null,
        search: ''
    },
    
    // Connection preferences
    connectionPreferences: {
        enableAutoReconnect: true,
        reconnectDelay: 5000,
        maxReconnectAttempts: 5,
        enableHeartbeat: true,
        heartbeatInterval: 30000,
        enableNotifications: true,
        enableToasts: true,
        enableMetrics: true,
        enableOfflineQueue: true,
        enableDebugLogging: false,
        messageRetentionLimit: 50,
        enableConnectionHealth: true,
        slowConnectionThreshold: 2000,
        connectionTimeoutThreshold: 10000,
        enableBandwidthOptimization: true
    },
    
    // Error handling
    error: null,
    lastError: null,
    errorHistory: [],
    
    // Online/offline state
    isOnline: true,
    wasOffline: false,
    offlineQueue: [],
    
    // Real-time features
    activeSubscriptions: [],
    channelStates: {},
    
    // Performance monitoring
    performanceMetrics: {
        averageMessageSize: 0,
        peakConnectionTime: 0,
        slowestMessageType: null,
        fastestMessageType: null,
        bandwidthUsage: 0,
        compressionRatio: 0
    }
};

// Create the slice
const webSocketSlice = createSlice({
    name: 'webSocket',
    initialState,
    reducers: {
        // Connection status management
        updateConnectionStatus: (state, action) => {
            state.connectionStatus = { 
                ...state.connectionStatus, 
                ...action.payload,
                lastUpdated: new Date().toISOString()
            };
            
            // Track connection uptime
            if (action.payload.status === 'connected' && action.payload.connectedAt) {
                state.connectionMetrics.connectionUptime = 0;
            }
        },
        
        // Set connection state
        setConnectionState: (state, action) => {
            const { status, details = {} } = action.payload;
            state.connectionStatus.status = status;
            
            if (status === 'connected') {
                state.connectionStatus.connectedAt = new Date().toISOString();
                state.connectionStatus.reconnectAttempts = 0;
                state.error = null;
            } else if (status === 'disconnected') {
                state.connectionStatus.disconnectedAt = new Date().toISOString();
            }
            
            Object.assign(state.connectionStatus, details);
        },
        
        // Message management
        addMessage: (state, action) => {
            const message = {
                ...action.payload,
                id: action.payload.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: action.payload.timestamp || new Date().toISOString(),
                read: false
            };
            
            state.messageHistory.unshift(message);
            state.unreadMessages += 1;
            
            // Maintain message history limit
            if (state.messageHistory.length > state.connectionPreferences.messageRetentionLimit) {
                state.messageHistory = state.messageHistory.slice(0, state.connectionPreferences.messageRetentionLimit);
            }
        },
        
        // Add to message history
        addToMessageHistory: (state, action) => {
            const message = {
                ...action.payload,
                id: action.payload.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: action.payload.timestamp || new Date().toISOString()
            };
            
            state.messageHistory.unshift(message);
            
            // Maintain history limit
            if (state.messageHistory.length > state.connectionPreferences.messageRetentionLimit) {
                state.messageHistory = state.messageHistory.slice(0, state.connectionPreferences.messageRetentionLimit);
            }
        },
        
        // Mark messages as read
        markMessagesAsRead: (state, action) => {
            const messageIds = action.payload;
            state.messageHistory.forEach(message => {
                if (messageIds.includes(message.id)) {
                    message.read = true;
                }
            });
            state.unreadMessages = Math.max(0, state.unreadMessages - messageIds.length);
        },
        
        // Clear all messages
        clearMessages: (state) => {
            state.messageHistory = [];
            state.unreadMessages = 0;
        },
        
        // Update connection metrics
        updateConnectionMetrics: (state, action) => {
            state.connectionMetrics = { 
                ...state.connectionMetrics, 
                ...action.payload,
                lastUpdated: new Date().toISOString()
            };
        },
        
        // Increment counters
        incrementMessageCount: (state, action) => {
            const { type = 'received', size = 0 } = action.payload;
            
            if (type === 'received') {
                state.connectionMetrics.messagesReceived += 1;
            } else if (type === 'sent') {
                state.connectionMetrics.messagesSent += 1;
            }
            
            state.connectionMetrics.dataTransferred += size;
            state.connectionMetrics.lastMessageAt = new Date().toISOString();
        },
        
        // Set connection preferences
        setConnectionPreferences: (state, action) => {
            state.connectionPreferences = { 
                ...state.connectionPreferences, 
                ...action.payload 
            };
        },
        
        // Update single preference
        updatePreference: (state, action) => {
            const { key, value } = action.payload;
            state.connectionPreferences[key] = value;
        },
        
        // Error management
        setError: (state, action) => {
            const error = {
                ...action.payload,
                timestamp: action.payload.timestamp || new Date().toISOString(),
                id: `error_${Date.now()}`
            };
            
            state.error = error;
            state.lastError = error;
            state.errorHistory.unshift(error);
            state.connectionMetrics.errorCount += 1;
            state.connectionMetrics.lastErrorAt = error.timestamp;
            
            // Keep only last 20 errors
            if (state.errorHistory.length > 20) {
                state.errorHistory = state.errorHistory.slice(0, 20);
            }
        },
        
        // Clear current error
        clearError: (state) => {
            state.error = null;
        },
        
        // Clear error history
        clearErrorHistory: (state) => {
            state.errorHistory = [];
        },
        
        // Online/offline management
        setOnlineStatus: (state, action) => {
            const wasOnline = state.isOnline;
            state.isOnline = action.payload;
            
            if (!wasOnline && action.payload) {
                // Just came back online
                state.wasOffline = true;
            }
        },
        
        // Offline queue management
        addToOfflineQueue: (state, action) => {
            state.offlineQueue.push({
                ...action.payload,
                queuedAt: new Date().toISOString()
            });
        },
        
        // Clear offline queue
        clearOfflineQueue: (state) => {
            state.offlineQueue = [];
        },
        
        // Subscription management
        addSubscription: (state, action) => {
            const subscription = action.payload;
            if (!state.activeSubscriptions.find(sub => sub.channel === subscription.channel)) {
                state.activeSubscriptions.push({
                    ...subscription,
                    subscribedAt: new Date().toISOString()
                });
            }
        },
        
        // Remove subscription
        removeSubscription: (state, action) => {
            const channel = action.payload;
            state.activeSubscriptions = state.activeSubscriptions.filter(
                sub => sub.channel !== channel
            );
            delete state.channelStates[channel];
        },
        
        // Update channel state
        updateChannelState: (state, action) => {
            const { channel, state: channelState } = action.payload;
            state.channelStates[channel] = {
                ...state.channelStates[channel],
                ...channelState,
                lastUpdated: new Date().toISOString()
            };
        },
        
        // Performance metrics
        updatePerformanceMetrics: (state, action) => {
            state.performanceMetrics = {
                ...state.performanceMetrics,
                ...action.payload
            };
        },
        
        // Message filtering
        setMessageFilter: (state, action) => {
            state.messageFilter = { 
                ...state.messageFilter, 
                ...action.payload 
            };
        },
        
        // Reset all state
        resetWebSocketState: (state) => {
            return { ...initialState };
        }
    },
    extraReducers: (builder) => {
        // Test connection cases
        builder
            .addCase(testConnection.pending, (state) => {
                state.connectionStatus.status = 'connecting';
                state.error = null;
            })
            .addCase(testConnection.fulfilled, (state, action) => {
                state.connectionStatus.status = 'connected';
                state.connectionMetrics = {
                    ...state.connectionMetrics,
                    ...action.payload,
                    lastConnectionTest: action.payload.timestamp
                };
            })
            .addCase(testConnection.rejected, (state, action) => {
                state.connectionStatus.status = 'error';
                state.error = {
                    message: action.payload,
                    type: 'connection_test_failed',
                    timestamp: new Date().toISOString()
                };
            });
        
        // Reconnect cases
        builder
            .addCase(reconnectWebSocket.pending, (state) => {
                state.connectionStatus.status = 'reconnecting';
                state.connectionStatus.reconnectAttempts += 1;
            })
            .addCase(reconnectWebSocket.fulfilled, (state, action) => {
                state.connectionStatus.status = 'connected';
                state.connectionMetrics.totalReconnections += 1;
                state.error = null;
            })
            .addCase(reconnectWebSocket.rejected, (state, action) => {
                state.connectionStatus.status = 'error';
                state.error = {
                    message: action.payload,
                    type: 'reconnection_failed',
                    timestamp: new Date().toISOString()
                };
            });
    }
});

// Export actions
export const {
    updateConnectionStatus,
    setConnectionState,
    addMessage,
    addToMessageHistory,
    markMessagesAsRead,
    clearMessages,
    updateConnectionMetrics,
    incrementMessageCount,
    setConnectionPreferences,
    updatePreference,
    setError,
    clearError,
    clearErrorHistory,
    setOnlineStatus,
    addToOfflineQueue,
    clearOfflineQueue,
    addSubscription,
    removeSubscription,
    updateChannelState,
    updatePerformanceMetrics,
    setMessageFilter,
    resetWebSocketState
} = webSocketSlice.actions;

// Selectors
export const selectConnectionStatus = (state) => state.webSocket.connectionStatus;
export const selectConnectionMetrics = (state) => state.webSocket.connectionMetrics;
export const selectConnectionPreferences = (state) => state.webSocket.connectionPreferences;
export const selectMessageHistory = (state) => state.webSocket.messageHistory;
export const selectUnreadMessages = (state) => state.webSocket.unreadMessages;
export const selectConnectionError = (state) => state.webSocket.error;
export const selectErrorHistory = (state) => state.webSocket.errorHistory;
export const selectIsOnline = (state) => state.webSocket.isOnline;
export const selectOfflineQueue = (state) => state.webSocket.offlineQueue;
export const selectActiveSubscriptions = (state) => state.webSocket.activeSubscriptions;
export const selectChannelStates = (state) => state.webSocket.channelStates;
export const selectPerformanceMetrics = (state) => state.webSocket.performanceMetrics;
export const selectMessageFilter = (state) => state.webSocket.messageFilter;

// Complex selectors
export const selectIsConnected = (state) => 
    state.webSocket.connectionStatus.status === 'connected';

export const selectIsConnecting = (state) => 
    ['connecting', 'reconnecting'].includes(state.webSocket.connectionStatus.status);

export const selectConnectionHealth = (state) => {
    const metrics = state.webSocket.connectionMetrics;
    const now = new Date().getTime();
    const lastHeartbeat = metrics.lastHeartbeat ? new Date(metrics.lastHeartbeat).getTime() : null;
    
    return {
        isHealthy: lastHeartbeat ? (now - lastHeartbeat) < 60000 : false, // 1 minute threshold
        lastHeartbeat: metrics.lastHeartbeat,
        latency: metrics.averageLatency,
        uptime: metrics.connectionUptime,
        errorRate: metrics.errorCount / Math.max(metrics.messagesReceived, 1)
    };
};

export const selectFilteredMessages = (state) => {
    const messages = state.webSocket.messageHistory;
    const filter = state.webSocket.messageFilter;
    
    return messages.filter(message => {
        // Filter by types
        if (filter.types.length > 0 && !filter.types.includes(message.type)) {
            return false;
        }
        
        // Filter by search
        if (filter.search && !JSON.stringify(message).toLowerCase().includes(filter.search.toLowerCase())) {
            return false;
        }
        
        // Filter by date range
        if (filter.dateRange) {
            const messageDate = new Date(message.timestamp);
            if (messageDate < filter.dateRange.start || messageDate > filter.dateRange.end) {
                return false;
            }
        }
        
        return true;
    });
};

export const selectRecentErrors = (state) => 
    state.webSocket.errorHistory.slice(0, 5);

export const selectConnectionQuality = (state) => {
    const metrics = state.webSocket.connectionMetrics;
    const status = state.webSocket.connectionStatus;
    
    if (status.status !== 'connected') return 'poor';
    
    const errorRate = metrics.errorCount / Math.max(metrics.messagesReceived, 1);
    const latency = metrics.averageLatency || 0;
    
    if (errorRate > 0.1 || latency > 1000) return 'poor';
    if (errorRate > 0.05 || latency > 500) return 'fair';
    return 'good';
};

export default webSocketSlice.reducer;
