# System Status Dashboard

## Overview

The System Status Dashboard provides comprehensive monitoring of your application's health, including API endpoints and WebSocket connections. It offers real-time insights into system performance and availability.

## Features

### 🔍 **Real-time Monitoring**
- **Continuous Health Checks**: Automatically monitors all configured API endpoints every 30 seconds
- **Live WebSocket Status**: Shows current WebSocket connection state and metrics
- **Auto-refresh**: Dashboard updates automatically without user intervention

### 📊 **Comprehensive Metrics**
- **Response Times**: Tracks API response times with slow/fast indicators
- **Availability**: Calculates uptime percentage for each service
- **Success/Error Counts**: Historical tracking of successful vs failed requests
- **Overall System Health**: Aggregate health score across all services

### 🚨 **Intelligent Alerting**
- **Status Classifications**: 
  - 🟢 **Healthy**: All systems operational
  - 🟡 **Degraded**: Some services experiencing issues
  - 🔴 **Down**: Critical services unavailable
- **Critical Service Indicators**: Important services marked with warning icons
- **Visual Status Badges**: Color-coded status indicators throughout the interface

### 🛠️ **Management Controls**
- **Start/Stop Monitoring**: Toggle continuous monitoring on/off
- **Manual Refresh**: Force immediate health check of all services
- **Individual Testing**: Test specific endpoints on demand
- **Circuit Breaker Integration**: Respects WebSocket connection limits

## Architecture

### System Health Service (`systemHealthService.js`)
```javascript
// Core monitoring engine with features:
- Circuit breaker pattern for resilience
- Exponential backoff for failed requests
- Historical data tracking (last 50 checks per endpoint)
- Availability calculations
- Event-driven notifications
```

### React Hook (`useSystemHealth.js`)
```javascript
// React integration providing:
- State management for health data
- Auto-initialization of endpoints
- Real-time updates via event subscription
- Easy-to-use API for components
```

### Dashboard Component (`SystemStatus.jsx`)
```javascript
// User interface featuring:
- Overall system health overview
- Detailed API endpoint monitoring
- WebSocket connection status
- Interactive controls and testing
```

## Configuration

### API Endpoints Monitored

1. **Primary API Health** (`/health`)
   - **Critical**: Yes
   - **Method**: GET
   - **Timeout**: 5 seconds
   - **Slow Threshold**: 1 second

2. **Face Detection API** (`/detect-faces`)
   - **Critical**: Yes
   - **Method**: HEAD
   - **Timeout**: 10 seconds
   - **Slow Threshold**: 2 seconds

3. **Vector Search API** (`/vector-search`)
   - **Critical**: Yes
   - **Method**: HEAD
   - **Timeout**: 10 seconds
   - **Slow Threshold**: 2 seconds

4. **Image Upload API** (`/upload`)
   - **Critical**: No
   - **Method**: HEAD
   - **Timeout**: 10 seconds
   - **Slow Threshold**: 3 seconds

5. **Secondary API Health** (Secondary server `/health`)
   - **Critical**: No
   - **Method**: GET
   - **Timeout**: 5 seconds
   - **Slow Threshold**: 1 second

### WebSocket Monitoring

The dashboard integrates with the enhanced WebSocket connection system to show:
- Connection state (Connected/Connecting/Disconnected)
- Messages sent/received counters
- Connection duration
- Reconnection attempts and circuit breaker status
- Manual reconnection controls

## User Interface

### Overall Health Status
- **Green Alert**: All systems operational
- **Yellow Alert**: Partial service degradation
- **Red Alert**: Major service disruption
- **Summary Stats**: Healthy services count, average response time, uptime percentage

### WebSocket Connection Card
- Real-time connection status with icon
- Connection metrics (messages, duration)
- Force reconnect button when needed
- Integration with connection status component

### API Services Card
- Overview of all monitored endpoints
- Quick status indicators
- System metrics summary
- Live monitoring badge

### Detailed Status Table
- Complete endpoint information
- Response times with color coding
- Availability percentages with progress bars
- Individual test buttons
- Service criticality indicators

## Usage Examples

### Accessing the Dashboard
Navigate to `/system/status` in your application or click "System Status" in the navigation menu.

### Manual Health Checks
```javascript
// Refresh all endpoints
onClick={checkHealth}

// Test specific endpoint
onClick={() => checkEndpoint('Face Detection API')}
```

### Monitoring Controls
```javascript
// Toggle monitoring
const toggleMonitoring = () => {
  if (isMonitoring) {
    stopMonitoring();
  } else {
    startMonitoring();
  }
};
```

### Programmatic Access
```javascript
// Get current health status
const status = systemHealthService.getStatus();

// Get metrics
const metrics = systemHealthService.getMetrics();

// Export all data for debugging
const data = systemHealthService.exportData();
```

## Status Indicators

### Health Status Colors
- 🟢 **Green (Success)**: Service is healthy and responsive
- 🟡 **Yellow (Warning)**: Service is slow or experiencing minor issues
- 🔴 **Red (Danger)**: Service is down or experiencing errors
- ⚪ **Gray (Secondary)**: Service status unknown or checking

### Response Time Classifications
- **Fast**: < 1000ms (Green)
- **Normal**: 1000-2000ms (Green)
- **Slow**: 2000-5000ms (Yellow)
- **Very Slow**: > 5000ms (Red)

### Availability Ratings
- **Excellent**: ≥ 99% (Green)
- **Good**: 95-99% (Yellow)
- **Poor**: < 95% (Red)

## Navigation Integration

The System Status is accessible via:
- **Main Navigation**: Bottom section under "System"
- **Direct URL**: `/system/status`
- **Activity Icon**: Using Lucide React Activity icon

## Technical Details

### Performance Considerations
- Uses HEAD requests where possible to minimize bandwidth
- Implements request timeouts to prevent hanging
- Circuit breaker prevents excessive retry attempts
- Historical data limited to last 50 checks per endpoint

### Error Handling
- Graceful degradation when services are unavailable
- Clear error messages for different failure types
- Timeout detection and reporting
- Network connectivity awareness

### Data Persistence
- Health check history maintained in memory
- Configuration stored in localStorage
- No server-side storage required

## Future Enhancements

### Planned Features
- **Historical Charts**: Graphical representation of response times over time
- **Alert Notifications**: Browser notifications for service outages
- **Export Functionality**: Download health reports
- **Custom Thresholds**: User-configurable slow/error thresholds
- **Health Check Scheduling**: Custom intervals per endpoint

### Integration Possibilities
- **Metrics Collection**: Integration with monitoring services
- **Alerting Systems**: Webhook notifications for outages
- **Log Aggregation**: Centralized logging of health events
- **Performance Analytics**: Detailed performance insights

## Troubleshooting

### Common Issues

1. **No Endpoints Showing**
   - Check API configuration in `config/api.js`
   - Verify environment variables are set
   - Ensure network connectivity

2. **All Services Showing Error**
   - Check if backend servers are running
   - Verify CORS configuration
   - Check browser console for network errors

3. **WebSocket Always Disconnected**
   - Confirm WebSocket server is running on correct port
   - Check for firewall blocking WebSocket connections
   - Verify WebSocket URL configuration

### Debug Mode

Enable detailed logging by opening browser console and running:
```javascript
localStorage.setItem('webSocketPrefs', JSON.stringify({
  enableDebugLogging: true
}));
```

Then refresh the page to see detailed health check logs.

## API Reference

### SystemHealthService Methods

```javascript
// Add health check
systemHealthService.addHealthCheck(name, config)

// Remove health check  
systemHealthService.removeHealthCheck(name)

// Check specific endpoint
await systemHealthService.checkEndpoint(name)

// Check all endpoints
await systemHealthService.checkAll()

// Start continuous monitoring
systemHealthService.startMonitoring(interval)

// Stop monitoring
systemHealthService.stopMonitoring()

// Get current status
systemHealthService.getStatus()

// Get metrics
systemHealthService.getMetrics()

// Get history
systemHealthService.getHistory(name, limit)
```

### Hook Usage

```javascript
const {
  healthData,
  systemMetrics,
  overallHealth,
  isLoading,
  lastUpdate,
  checkHealth,
  checkEndpoint,
  startMonitoring,
  stopMonitoring,
  getStatusSummary,
  getCriticalStatus
} = useSystemHealth({
  autoStart: true,
  interval: 30000
});
```

This comprehensive monitoring system provides the foundation for maintaining application reliability and quickly identifying issues before they impact users.
