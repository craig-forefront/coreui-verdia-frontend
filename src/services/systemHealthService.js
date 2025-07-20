/**
 * System Health Monitoring Service
 * 
 * Provides comprehensive health monitoring for API endpoints and system components
 */

class SystemHealthService {
  constructor() {
    this.healthChecks = new Map();
    this.listeners = new Set();
    this.checkInterval = null;
    this.isMonitoring = false;
  }

  /**
   * Add a health check for an API endpoint
   */
  addHealthCheck(name, config) {
    this.healthChecks.set(name, {
      ...config,
      status: 'unknown',
      lastCheck: null,
      responseTime: null,
      errorCount: 0,
      successCount: 0,
      history: [],
    });
  }

  /**
   * Remove a health check
   */
  removeHealthCheck(name) {
    this.healthChecks.delete(name);
  }

  /**
   * Subscribe to health status changes
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of status changes
   */
  notifyListeners(eventType, data) {
    this.listeners.forEach(listener => {
      try {
        listener(eventType, data);
      } catch (error) {
        console.error('Error in health service listener:', error);
      }
    });
  }

  /**
   * Perform health check for a specific endpoint
   */
  async checkEndpoint(name) {
    const healthCheck = this.healthChecks.get(name);
    if (!healthCheck) {
      console.warn(`Health check not found: ${name}`);
      return null;
    }

    const startTime = Date.now();
    let result = {
      name,
      status: 'error',
      responseTime: 0,
      timestamp: new Date().toISOString(),
      error: null,
      statusCode: null,
      headers: {},
      metadata: {},
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), healthCheck.timeout || 10000);

      const fetchOptions = {
        method: healthCheck.method || 'HEAD',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SystemHealthMonitor/1.0',
          ...(healthCheck.headers || {}),
        },
      };

      // Add authentication if provided
      if (healthCheck.apiKey) {
        fetchOptions.headers['X-API-Key'] = healthCheck.apiKey;
      }

      const response = await fetch(healthCheck.url, fetchOptions);
      clearTimeout(timeoutId);

      result.responseTime = Date.now() - startTime;
      result.statusCode = response.status;
      result.headers = Object.fromEntries(response.headers.entries());

      // Determine health status based on response
      if (response.ok) {
        result.status = 'healthy';
        
        // Check response time thresholds
        if (result.responseTime > (healthCheck.slowThreshold || 2000)) {
          result.status = 'slow';
        }
      } else {
        result.status = 'error';
        result.error = `HTTP ${response.status}: ${response.statusText}`;
      }

      // Try to parse JSON response for additional metadata
      if (response.headers.get('content-type')?.includes('application/json')) {
        try {
          const data = await response.json();
          result.metadata = data;
        } catch (e) {
          // Ignore JSON parse errors for metadata
        }
      }

    } catch (error) {
      result.responseTime = Date.now() - startTime;
      result.error = error.name === 'AbortError' ? 'Request timeout' : error.message;
      result.status = 'error';
    }

    // Update health check record
    healthCheck.lastCheck = result.timestamp;
    healthCheck.responseTime = result.responseTime;
    healthCheck.status = result.status;

    if (result.status === 'healthy' || result.status === 'slow') {
      healthCheck.successCount++;
    } else {
      healthCheck.errorCount++;
    }

    // Maintain history (keep last 50 checks)
    healthCheck.history.push(result);
    if (healthCheck.history.length > 50) {
      healthCheck.history.shift();
    }

    // Calculate availability percentage
    const totalChecks = healthCheck.successCount + healthCheck.errorCount;
    healthCheck.availability = totalChecks > 0 ? (healthCheck.successCount / totalChecks) * 100 : 0;

    // Notify listeners
    this.notifyListeners('healthCheck', { name, result, healthCheck });

    return result;
  }

  /**
   * Check all registered endpoints
   */
  async checkAll() {
    const checks = Array.from(this.healthChecks.keys()).map(name => 
      this.checkEndpoint(name)
    );

    const results = await Promise.allSettled(checks);
    
    const summary = {
      timestamp: new Date().toISOString(),
      total: results.length,
      healthy: 0,
      slow: 0,
      error: 0,
      unknown: 0,
    };

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        summary[result.value.status]++;
      } else {
        summary.error++;
      }
    });

    // Calculate overall system health
    const overallHealth = this.calculateOverallHealth(summary);
    
    this.notifyListeners('systemHealth', { summary, overallHealth });
    
    return { summary, overallHealth, results };
  }

  /**
   * Calculate overall system health based on individual checks
   */
  calculateOverallHealth(summary) {
    const criticalEndpoints = Array.from(this.healthChecks.values())
      .filter(hc => hc.critical);
    
    const criticalHealthy = criticalEndpoints.filter(hc => 
      hc.status === 'healthy' || hc.status === 'slow'
    ).length;

    if (criticalHealthy === criticalEndpoints.length) {
      return summary.slow > 0 ? 'degraded' : 'healthy';
    } else if (criticalHealthy > 0) {
      return 'degraded';
    } else {
      return 'down';
    }
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(interval = 30000) {
    if (this.isMonitoring) {
      console.warn('Health monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    this.checkInterval = setInterval(() => {
      this.checkAll();
    }, interval);

    // Initial check
    this.checkAll();
    
    console.log(`Health monitoring started with ${interval}ms interval`);
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isMonitoring = false;
    console.log('Health monitoring stopped');
  }

  /**
   * Get current status of all health checks
   */
  getStatus() {
    const status = {};
    this.healthChecks.forEach((healthCheck, name) => {
      status[name] = {
        name,
        status: healthCheck.status,
        responseTime: healthCheck.responseTime,
        lastCheck: healthCheck.lastCheck,
        availability: healthCheck.availability,
        errorCount: healthCheck.errorCount,
        successCount: healthCheck.successCount,
        critical: healthCheck.critical,
        url: healthCheck.url,
      };
    });
    return status;
  }

  /**
   * Get detailed history for a specific endpoint
   */
  getHistory(name, limit = 10) {
    const healthCheck = this.healthChecks.get(name);
    if (!healthCheck) {
      return [];
    }
    return healthCheck.history.slice(-limit);
  }

  /**
   * Get system metrics
   */
  getMetrics() {
    const healthChecks = Array.from(this.healthChecks.values());
    
    return {
      totalEndpoints: healthChecks.length,
      criticalEndpoints: healthChecks.filter(hc => hc.critical).length,
      healthyEndpoints: healthChecks.filter(hc => hc.status === 'healthy').length,
      averageResponseTime: this.calculateAverageResponseTime(healthChecks),
      overallAvailability: this.calculateOverallAvailability(healthChecks),
      isMonitoring: this.isMonitoring,
      lastCheckTime: Math.max(...healthChecks.map(hc => 
        hc.lastCheck ? new Date(hc.lastCheck).getTime() : 0
      )),
    };
  }

  /**
   * Calculate average response time across all endpoints
   */
  calculateAverageResponseTime(healthChecks) {
    const validTimes = healthChecks
      .filter(hc => hc.responseTime !== null)
      .map(hc => hc.responseTime);
    
    return validTimes.length > 0 
      ? Math.round(validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length)
      : 0;
  }

  /**
   * Calculate overall availability across all endpoints
   */
  calculateOverallAvailability(healthChecks) {
    const availabilities = healthChecks
      .filter(hc => hc.availability !== undefined)
      .map(hc => hc.availability);
    
    return availabilities.length > 0
      ? Math.round(availabilities.reduce((sum, avail) => sum + avail, 0) / availabilities.length)
      : 0;
  }

  /**
   * Export health data for debugging
   */
  exportData() {
    return {
      healthChecks: Object.fromEntries(this.healthChecks),
      metrics: this.getMetrics(),
      timestamp: new Date().toISOString(),
    };
  }
}

// Create singleton instance
const systemHealthService = new SystemHealthService();

export default systemHealthService;
