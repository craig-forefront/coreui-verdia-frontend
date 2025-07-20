import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCardTitle,
  CCol,
  CRow,
  CBadge,
  CButton,
  CProgress,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CAlert,
  CSpinner,
  CButtonGroup,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilCheckCircle,
  cilWarning,
  cilXCircle,
  cilClock,
  cilReload,
  cilWifiSignal0,
  cilWifiSignal4,
  cilMediaPlay,
  cilX,
} from '@coreui/icons';
import { Activity, Server, Wifi, Database, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { ConnectionStatus } from '../../components';
import { selectConnectionStatus, selectConnectionMetrics } from '../../store/webSocketSlice';
import useSystemHealth from '../../hooks/useSystemHealth';

const SystemStatus = () => {
  // WebSocket status from Redux
  const wsConnectionStatus = useSelector(selectConnectionStatus);
  const wsConnectionMetrics = useSelector(selectConnectionMetrics);

  // System health monitoring
  const {
    healthData,
    systemMetrics,
    overallHealth: systemOverallHealth,
    isLoading,
    lastUpdate,
    checkHealth,
    checkEndpoint,
    startMonitoring,
    stopMonitoring,
    getStatusSummary,
    getCriticalStatus,
    getEndpointHistory,
    healthService,
  } = useSystemHealth({
    autoStart: true,
    interval: 30000,
  });

  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(true);

  // Get status badge color and icon
  const getStatusInfo = (status, responseTime) => {
    switch (status) {
      case 'healthy':
        return {
          color: 'success',
          icon: cilCheckCircle,
          text: 'Healthy',
        };
      case 'slow':
        return {
          color: 'warning',
          icon: cilWarning,
          text: `Slow (${responseTime}ms)`,
        };
      case 'error':
        return {
          color: 'danger',
          icon: cilXCircle,
          text: 'Error',
        };
      default:
        return {
          color: 'secondary',
          icon: cilClock,
          text: 'Unknown',
        };
    }
  };

  // Toggle monitoring
  const toggleMonitoring = useCallback(() => {
    if (isMonitoring) {
      stopMonitoring();
    } else {
      startMonitoring();
    }
    setIsMonitoring(!isMonitoring);
  }, [isMonitoring, startMonitoring, stopMonitoring]);

  // Get overall health status
  const getOverallHealthInfo = () => {
    const criticalStatus = getCriticalStatus();
    const wsHealth = wsConnectionStatus.status === 'connected';
    
    if (systemOverallHealth === 'healthy' && wsHealth) {
      return { status: 'healthy', color: 'success', text: 'All Systems Operational' };
    } else if (systemOverallHealth === 'degraded' || (!wsHealth && criticalStatus.healthy > 0)) {
      return { status: 'degraded', color: 'warning', text: 'Partial Service Degradation' };
    } else {
      return { status: 'down', color: 'danger', text: 'Major Service Disruption' };
    }
  };

  // Get WebSocket status info
  const getWebSocketStatusInfo = () => {
    const { status, reconnectAttempts = 0, maxReconnectAttempts = 10, isCircuitBreakerOpen = false } = wsConnectionStatus;
    
    switch (status) {
      case 'connected':
        return {
          color: 'success',
          icon: cilWifiSignal4,
          text: 'Connected',
          description: 'Real-time updates active',
        };
      case 'connecting':
        return {
          color: 'warning',
          icon: cilClock,
          text: 'Connecting...',
          description: 'Establishing connection',
        };
      case 'disconnected':
        if (isCircuitBreakerOpen) {
          return {
            color: 'danger',
            icon: cilWarning,
            text: 'Circuit Breaker Open',
            description: 'Too many failed attempts - server may be unavailable',
          };
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          return {
            color: 'danger',
            icon: cilXCircle,
            text: 'Connection Failed',
            description: `Max attempts reached (${reconnectAttempts}/${maxReconnectAttempts})`,
          };
        } else {
          return {
            color: 'warning',
            icon: cilWifiSignal0,
            text: 'Reconnecting',
            description: `Attempt ${reconnectAttempts + 1} of ${maxReconnectAttempts}`,
          };
        }
      default:
        return {
          color: 'secondary',
          icon: cilWifiSignal0,
          text: 'Unknown',
          description: 'Connection status unknown',
        };
    }
  };

  const overallHealthInfo = getOverallHealthInfo();
  const statusSummary = getStatusSummary();
  const wsStatus = getWebSocketStatusInfo();  return (
    <div>
      <CRow>
        <CCol xs={12}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0">
              <Activity className="me-2" size={28} />
              System Status
            </h1>
            <div className="d-flex align-items-center gap-3">
              {lastUpdate && (
                <small className="text-muted">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </small>
              )}
              <CButtonGroup>
                <CButton
                  color={isMonitoring ? 'success' : 'secondary'}
                  variant="outline"
                  onClick={toggleMonitoring}
                  size="sm"
                >
                  <CIcon icon={isMonitoring ? cilX : cilMediaPlay} className="me-1" />
                  {isMonitoring ? 'Monitoring' : 'Stopped'}
                </CButton>
                <CButton
                  color="primary"
                  variant="outline"
                  onClick={checkHealth}
                  disabled={isLoading}
                  size="sm"
                >
                  <CIcon icon={cilReload} className={isLoading ? 'fa-spin me-1' : 'me-1'} />
                  {isLoading ? 'Checking...' : 'Refresh'}
                </CButton>
              </CButtonGroup>
            </div>
          </div>
        </CCol>
      </CRow>

      {/* Overall Health Status */}
      <CRow className="mb-4">
        <CCol xs={12}>
          <CAlert color={overallHealthInfo.color} className="d-flex align-items-center">
            <CIcon 
              icon={overallHealthInfo.status === 'healthy' ? cilCheckCircle : cilWarning} 
              className="me-2" 
              size="lg"
            />
            <div className="flex-grow-1">
              <h5 className="mb-1">{overallHealthInfo.text}</h5>
              <small>
                {statusSummary.total > 0 ? (
                  `${statusSummary.healthy} of ${statusSummary.total} services healthy • `
                ) : 'No services configured • '}
                WebSocket: {wsStatus.text}
                {systemMetrics.averageResponseTime > 0 && (
                  ` • Avg Response: ${systemMetrics.averageResponseTime}ms`
                )}
              </small>
            </div>
            {systemMetrics.overallAvailability > 0 && (
              <div className="text-end">
                <div className="h5 mb-0">{systemMetrics.overallAvailability}%</div>
                <small>Uptime</small>
              </div>
            )}
          </CAlert>
        </CCol>
      </CRow>

      <CRow>
        {/* WebSocket Connection Status */}
        <CCol md={6} className="mb-4">
          <CCard>
            <CCardHeader>
              <CCardTitle className="d-flex align-items-center">
                <Wifi className="me-2" size={20} />
                WebSocket Connection
                <ConnectionStatus className="ms-auto" />
              </CCardTitle>
            </CCardHeader>
            <CCardBody>
              <div className="d-flex align-items-center mb-3">
                <CBadge color={wsStatus.color} className="me-2">
                  <CIcon icon={wsStatus.icon} className="me-1" />
                  {wsStatus.text}
                </CBadge>
              </div>
              <p className="text-muted mb-3">{wsStatus.description}</p>
              
              {wsConnectionMetrics && (
                <div className="small">
                  <div className="d-flex justify-content-between mb-1">
                    <span>Messages Received:</span>
                    <span>{wsConnectionMetrics.messagesReceived || 0}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span>Messages Sent:</span>
                    <span>{wsConnectionMetrics.messagesSent || 0}</span>
                  </div>
                  {wsConnectionStatus.connectedAt && (
                    <div className="d-flex justify-content-between">
                      <span>Connected Since:</span>
                      <span>{new Date(wsConnectionStatus.connectedAt).toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>
              )}

              {wsConnectionStatus.status !== 'connected' && (
                <div className="mt-3">
                  <CButton
                    size="sm"
                    color="primary"
                    variant="outline"
                    onClick={() => window.webSocketManager?.forceReconnect()}
                  >
                    Force Reconnect
                  </CButton>
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        {/* API Services Overview */}
        <CCol md={6} className="mb-4">
          <CCard>
            <CCardHeader>
              <CCardTitle className="d-flex align-items-center">
                <Server className="me-2" size={20} />
                API Services
                <CBadge color="secondary" className="ms-auto">
                  {Object.keys(healthData).length} endpoints
                </CBadge>
              </CCardTitle>
            </CCardHeader>
            <CCardBody>
              {isLoading && Object.keys(healthData).length === 0 && (
                <div className="text-center mb-3">
                  <CSpinner size="sm" className="me-2" />
                  Loading API endpoints...
                </div>
              )}
              
              <div className="d-grid gap-2">
                {Object.entries(healthData).map(([name, status]) => {
                  const statusInfo = getStatusInfo(status.status, status.responseTime);
                  const isCritical = healthService.healthChecks.get(name)?.critical;
                  
                  return (
                    <div key={name} className="d-flex align-items-center justify-content-between p-2 border rounded">
                      <div className="d-flex align-items-center">
                        <div className="me-2">
                          {isCritical && (
                            <AlertTriangle size={16} className="text-warning me-1" />
                          )}
                          <strong>{name}</strong>
                        </div>
                      </div>
                      <div className="d-flex align-items-center">
                        {status.responseTime && (
                          <small className="text-muted me-2">
                            {status.responseTime}ms
                          </small>
                        )}
                        <CBadge color={statusInfo.color}>
                          <CIcon icon={statusInfo.icon} className="me-1" />
                          {statusInfo.text}
                        </CBadge>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* System Metrics */}
              {systemMetrics.totalEndpoints > 0 && (
                <div className="mt-3 pt-3 border-top">
                  <div className="d-flex justify-content-between text-sm">
                    <div>
                      <TrendingUp size={14} className="me-1" />
                      <strong>Metrics</strong>
                    </div>
                  </div>
                  <div className="row text-center mt-2">
                    <div className="col">
                      <div className="h6 mb-0 text-success">{systemMetrics.healthyEndpoints}</div>
                      <small className="text-muted">Healthy</small>
                    </div>
                    <div className="col">
                      <div className="h6 mb-0">{systemMetrics.averageResponseTime}ms</div>
                      <small className="text-muted">Avg Response</small>
                    </div>
                    <div className="col">
                      <div className="h6 mb-0">{systemMetrics.overallAvailability}%</div>
                      <small className="text-muted">Uptime</small>
                    </div>
                  </div>
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Detailed API Status Table */}
      <CRow>
        <CCol xs={12}>
          <CCard>
            <CCardHeader>
              <CCardTitle className="d-flex align-items-center">
                <Database className="me-2" size={20} />
                Detailed API Status
                {systemMetrics.isMonitoring && (
                  <CBadge color="success" className="ms-2">Live Monitoring</CBadge>
                )}
              </CCardTitle>
            </CCardHeader>
            <CCardBody>
              <CTable responsive hover>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Service</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Response Time</CTableHeaderCell>
                    <CTableHeaderCell>Availability</CTableHeaderCell>
                    <CTableHeaderCell>Last Checked</CTableHeaderCell>
                    <CTableHeaderCell>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {Object.entries(healthData).map(([name, status]) => {
                    const statusInfo = getStatusInfo(status.status, status.responseTime);
                    const healthCheck = healthService.healthChecks.get(name);
                    const isCritical = healthCheck?.critical;
                    
                    return (
                      <CTableRow key={name}>
                        <CTableDataCell>
                          <div className="d-flex align-items-center">
                            {isCritical && (
                              <AlertTriangle size={16} className="text-warning me-2" />
                            )}
                            <div>
                              <strong>{name}</strong>
                              <br />
                              <small className="text-muted">
                                {healthCheck?.url ? new URL(healthCheck.url).pathname : 'Unknown endpoint'}
                              </small>
                            </div>
                          </div>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={statusInfo.color}>
                            <CIcon icon={statusInfo.icon} className="me-1" />
                            {statusInfo.text}
                          </CBadge>
                          {isCritical && (
                            <CBadge color="warning" className="ms-1" size="sm">
                              Critical
                            </CBadge>
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          {status.responseTime ? (
                            <span className={status.responseTime > 2000 ? 'text-warning' : 'text-success'}>
                              {status.responseTime}ms
                            </span>
                          ) : (
                            '-'
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          {healthCheck?.availability !== undefined ? (
                            <div>
                              <div className="d-flex align-items-center">
                                <span className={healthCheck.availability >= 99 ? 'text-success' : healthCheck.availability >= 95 ? 'text-warning' : 'text-danger'}>
                                  {healthCheck.availability.toFixed(1)}%
                                </span>
                              </div>
                              <CProgress
                                className="mt-1"
                                height={4}
                                value={healthCheck.availability}
                                color={healthCheck.availability >= 99 ? 'success' : healthCheck.availability >= 95 ? 'warning' : 'danger'}
                              />
                            </div>
                          ) : (
                            '-'
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          {status.timestamp ? (
                            <small>{new Date(status.timestamp).toLocaleTimeString()}</small>
                          ) : (
                            '-'
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CButton
                            size="sm"
                            color="primary"
                            variant="outline"
                            onClick={() => checkEndpoint(name)}
                          >
                            Test
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    );
                  })}
                  
                  {Object.keys(healthData).length === 0 && !isLoading && (
                    <CTableRow>
                      <CTableDataCell colSpan={6} className="text-center py-4">
                        <div className="text-muted">
                          <Database size={48} className="mb-2 opacity-50" />
                          <div>No API endpoints configured for monitoring</div>
                        </div>
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  );
};

export default SystemStatus;
