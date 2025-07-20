import { useState, useEffect, useCallback } from 'react';
import systemHealthService from '../services/systemHealthService';
import { getPrimaryApiUrl, getSecondaryApiUrl, API_ENDPOINTS, API_KEY } from '../config/api';

/**
 * Custom hook for system health monitoring
 * Provides real-time health status of API endpoints and system components
 */
const useSystemHealth = (options = {}) => {
  const {
    autoStart = true,
    interval = 30000,
    enableNotifications = false,
  } = options;

  const [healthData, setHealthData] = useState({});
  const [systemMetrics, setSystemMetrics] = useState({});
  const [overallHealth, setOverallHealth] = useState('unknown');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Initialize health checks
  useEffect(() => {
    // Add API endpoint health checks
    const endpoints = [
      {
        name: 'Primary API Health',
        url: getPrimaryApiUrl('/health'),
        method: 'GET',
        critical: true,
        timeout: 5000,
        slowThreshold: 1000,
        apiKey: API_KEY,
      },
      {
        name: 'Face Detection API',
        url: getPrimaryApiUrl(API_ENDPOINTS.PRIMARY.ENDPOINTS.FACE_DETECTION),
        method: 'HEAD',
        critical: true,
        timeout: 10000,
        slowThreshold: 2000,
        apiKey: API_KEY,
      },
      {
        name: 'Vector Search API',
        url: getPrimaryApiUrl(API_ENDPOINTS.PRIMARY.ENDPOINTS.VECTOR_SEARCH),
        method: 'HEAD',
        critical: true,
        timeout: 10000,
        slowThreshold: 2000,
        apiKey: API_KEY,
      },
      {
        name: 'Image Upload API',
        url: getPrimaryApiUrl(API_ENDPOINTS.PRIMARY.ENDPOINTS.IMAGE_UPLOAD),
        method: 'HEAD',
        critical: false,
        timeout: 10000,
        slowThreshold: 3000,
        apiKey: API_KEY,
      },
      {
        name: 'Secondary API Health',
        url: getSecondaryApiUrl('/health'),
        method: 'GET',
        critical: false,
        timeout: 5000,
        slowThreshold: 1000,
      },
    ];

    // Add all health checks
    endpoints.forEach(endpoint => {
      systemHealthService.addHealthCheck(endpoint.name, endpoint);
    });

    return () => {
      // Cleanup: remove health checks
      endpoints.forEach(endpoint => {
        systemHealthService.removeHealthCheck(endpoint.name);
      });
    };
  }, []);

  // Subscribe to health service updates
  useEffect(() => {
    const unsubscribe = systemHealthService.subscribe((eventType, data) => {
      if (eventType === 'healthCheck') {
        setHealthData(prev => ({
          ...prev,
          [data.name]: data.result,
        }));
      } else if (eventType === 'systemHealth') {
        setOverallHealth(data.overallHealth);
        setSystemMetrics(systemHealthService.getMetrics());
        setLastUpdate(new Date());
      }
    });

    return unsubscribe;
  }, []);

  // Auto-start monitoring
  useEffect(() => {
    if (autoStart) {
      systemHealthService.startMonitoring(interval);
      setIsLoading(false);
    }

    return () => {
      if (autoStart) {
        systemHealthService.stopMonitoring();
      }
    };
  }, [autoStart, interval]);

  // Manual health check function
  const checkHealth = useCallback(async () => {
    setIsLoading(true);
    try {
      await systemHealthService.checkAll();
      setHealthData(systemHealthService.getStatus());
      setSystemMetrics(systemHealthService.getMetrics());
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error checking system health:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check specific endpoint
  const checkEndpoint = useCallback(async (name) => {
    try {
      const result = await systemHealthService.checkEndpoint(name);
      if (result) {
        setHealthData(prev => ({
          ...prev,
          [name]: result,
        }));
      }
      return result;
    } catch (error) {
      console.error(`Error checking endpoint ${name}:`, error);
      return null;
    }
  }, []);

  // Get endpoint history
  const getEndpointHistory = useCallback((name, limit = 10) => {
    return systemHealthService.getHistory(name, limit);
  }, []);

  // Start/stop monitoring
  const startMonitoring = useCallback((customInterval = interval) => {
    systemHealthService.startMonitoring(customInterval);
  }, [interval]);

  const stopMonitoring = useCallback(() => {
    systemHealthService.stopMonitoring();
  }, []);

  // Get status summary
  const getStatusSummary = useCallback(() => {
    const allStatus = Object.values(healthData);
    const summary = {
      total: allStatus.length,
      healthy: allStatus.filter(s => s.status === 'healthy').length,
      slow: allStatus.filter(s => s.status === 'slow').length,
      error: allStatus.filter(s => s.status === 'error').length,
      unknown: allStatus.filter(s => s.status === 'unknown').length,
    };

    return summary;
  }, [healthData]);

  // Get critical endpoints status
  const getCriticalStatus = useCallback(() => {
    const criticalEndpoints = Object.entries(healthData).filter(([name, data]) => {
      const healthCheck = systemHealthService.healthChecks.get(name);
      return healthCheck?.critical;
    });

    return {
      total: criticalEndpoints.length,
      healthy: criticalEndpoints.filter(([, data]) => data.status === 'healthy').length,
      issues: criticalEndpoints.filter(([, data]) => data.status !== 'healthy'),
    };
  }, [healthData]);

  return {
    // Data
    healthData,
    systemMetrics,
    overallHealth,
    isLoading,
    lastUpdate,

    // Actions
    checkHealth,
    checkEndpoint,
    startMonitoring,
    stopMonitoring,

    // Utilities
    getEndpointHistory,
    getStatusSummary,
    getCriticalStatus,

    // Service instance for advanced usage
    healthService: systemHealthService,
  };
};

export default useSystemHealth;
