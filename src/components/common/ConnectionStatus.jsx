import React from 'react';
import { useSelector } from 'react-redux';
import { CBadge } from '@coreui/react';
import { cilWifiSignal0, cilWifiSignal1, cilWifiSignal4 } from '@coreui/icons';
import CIcon from '@coreui/icons-react';
import { selectConnectionStatus } from '../../store/webSocketSlice';

/**
 * Small connection status indicator that can be placed anywhere in the UI
 * Shows current WebSocket connection state with minimal visual footprint
 */
const ConnectionStatus = ({ 
    showText = true, 
    size = 'sm',
    className = '' 
}) => {
    const connectionStatus = useSelector(selectConnectionStatus);
    
    const getStatusInfo = () => {
        const { status, reconnectAttempts = 0, maxReconnectAttempts = 10, isCircuitBreakerOpen = false } = connectionStatus;
        
        switch (status) {
            case 'connected':
                return {
                    color: 'success',
                    icon: cilWifiSignal4,
                    text: 'Connected',
                    title: 'Real-time updates active'
                };
            case 'connecting':
                return {
                    color: 'warning',
                    icon: cilWifiSignal1,
                    text: 'Connecting...',
                    title: 'Establishing connection'
                };
            case 'disconnected':
                if (isCircuitBreakerOpen) {
                    return {
                        color: 'danger',
                        icon: cilWifiSignal0,
                        text: 'Connection Failed',
                        title: 'Too many failed attempts - server may be unavailable'
                    };
                } else if (reconnectAttempts >= maxReconnectAttempts) {
                    return {
                        color: 'danger',
                        icon: cilWifiSignal0,
                        text: 'Connection Lost',
                        title: `Max reconnection attempts reached (${reconnectAttempts}/${maxReconnectAttempts})`
                    };
                } else {
                    return {
                        color: 'warning',
                        icon: cilWifiSignal1,
                        text: `Reconnecting (${reconnectAttempts + 1}/${maxReconnectAttempts})`,
                        title: 'Attempting to reconnect to server'
                    };
                }
            default:
                return {
                    color: 'secondary',
                    icon: cilWifiSignal0,
                    text: 'Unknown',
                    title: 'Connection status unknown'
                };
        }
    };

    const statusInfo = getStatusInfo();

    return (
        <CBadge 
            color={statusInfo.color} 
            size={size}
            className={`d-inline-flex align-items-center ${className}`}
            title={statusInfo.title}
        >
            <CIcon icon={statusInfo.icon} size="sm" className="me-1" />
            {showText && statusInfo.text}
        </CBadge>
    );
};

export default ConnectionStatus;
