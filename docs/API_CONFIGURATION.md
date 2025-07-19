# API Configuration Guide

This project has been configured to work with two backend API services through centralized configuration.

## Environment Variables

The application uses the following environment variables for API configuration:

### Primary API (Port 8000)
- `VITE_PRIMARY_API_URL`: Main face detection and processing API (default: http://localhost:8000)
- `VITE_PRIMARY_WS_URL`: WebSocket URL for the primary API (default: ws://localhost:8000)

### Secondary API (Port 8001)
- `VITE_SECONDARY_API_URL`: InsightFace processing API (default: http://localhost:8001)  
- `VITE_SECONDARY_WS_URL`: WebSocket URL for the secondary API (default: ws://localhost:8001)

### Authentication
- `VITE_API_KEY`: API key for authentication

### Legacy Variables
For backwards compatibility, these are still supported:
- `REACT_APP_API_KEY`: Legacy API key
- `REACT_APP_API_URL`: Legacy primary API URL

## Configuration Files

### Environment Configuration (`src/config/api.js`)
This is the central configuration file that:
- Reads environment variables with proper fallbacks
- Provides typed constants for API endpoints
- Includes helper functions for building URLs
- Handles both development and production environments

### Key exports:
- `PRIMARY_API_BASE_URL`: Base URL for the main API
- `SECONDARY_API_BASE_URL`: Base URL for the InsightFace API
- `API_ENDPOINTS`: Object containing all endpoint configurations
- `getPrimaryApiUrl(endpoint)`: Helper to build primary API URLs
- `getSecondaryApiUrl(endpoint)`: Helper to build secondary API URLs

## Setup Instructions

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the URLs in `.env` to match your backend setup:
   ```env
   VITE_PRIMARY_API_URL=http://your-primary-api:8000
   VITE_SECONDARY_API_URL=http://your-secondary-api:8001
   VITE_API_KEY=your_actual_api_key
   ```

3. For production, use HTTPS URLs:
   ```env
   VITE_PRIMARY_API_URL=https://api.yourdomain.com
   VITE_SECONDARY_API_URL=https://insightface-api.yourdomain.com
   ```

## Usage in Code

Instead of hardcoding URLs, import from the configuration:

```javascript
import { 
  getPrimaryApiUrl, 
  getSecondaryApiUrl, 
  API_ENDPOINTS, 
  API_KEY 
} from '../config/api.js';

// Use primary API
const response = await axios.post(
  getPrimaryApiUrl(API_ENDPOINTS.PRIMARY.ENDPOINTS.FACE_DETECTION), 
  data,
  { headers: { 'X-API-Key': API_KEY } }
);

// Use secondary API  
const response = await axios.post(
  getSecondaryApiUrl(API_ENDPOINTS.SECONDARY.ENDPOINTS.INSIGHTFACE_DETECTION),
  data,
  { headers: { 'X-API-Key': API_KEY } }
);
```

## Development vs Production

The configuration automatically detects the environment:
- In development: Logs the current configuration to console
- Supports runtime environment variable injection via `window._env_`
- Falls back to sensible defaults if environment variables are missing

## Vite Configuration

The `vite.config.mjs` has been updated to use environment variables for proxy configuration, making it easy to switch between different backend environments during development.

## Migration Notes

The following files have been updated to use the centralized configuration:
- `src/services/faceApiService.js`
- `src/store/videoJobsSlice.js`
- `src/store/searchHistorySlice.js`
- `src/store/topScoresSlice.js`
- `src/hooks/useWebSocket.js`
- `src/views/search/FaceSearch.jsx`
- `src/views/video/SubmitVideosPage.jsx`
- `src/components/video/VideoUploader.jsx`
- `vite.config.mjs`

All hardcoded `localhost:8000` and `localhost:8001` references have been replaced with configurable environment variables.
