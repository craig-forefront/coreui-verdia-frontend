/**
 * Centralized API Configuration
 * 
 * This module provides a single source of truth for all API endpoints and configurations.
 * It handles environment variable fallbacks and provides typed constants for different
 * backend services.
 */

// Environment variables with fallbacks
const getEnvVar = (key, defaultValue = '') => {
  // Check Vite environment variables first (recommended for Vite projects)
  if (import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  
  // Check legacy React environment variables for backwards compatibility
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  
  // Check window-based environment variables (runtime configuration)
  if (typeof window !== 'undefined' && window._env_ && window._env_[key]) {
    return window._env_[key];
  }
  
  return defaultValue;
};

// Primary API backend (port 8000) - Main face detection and processing
export const PRIMARY_API_BASE_URL = getEnvVar('VITE_PRIMARY_API_URL', 'http://localhost:8000');

// Secondary API backend (port 8001) - InsightFace processing
export const SECONDARY_API_BASE_URL = getEnvVar('VITE_SECONDARY_API_URL', 'http://localhost:8001');

// WebSocket URLs
export const PRIMARY_WS_URL = getEnvVar('VITE_PRIMARY_WS_URL', 'ws://localhost:8000');
export const SECONDARY_WS_URL = getEnvVar('VITE_SECONDARY_WS_URL', 'ws://localhost:8001');

// API Key
export const API_KEY = getEnvVar('VITE_API_KEY') || getEnvVar('REACT_APP_API_KEY', '_Zwptd64P3sOd9Dt02c9xBAJ5PU1MUyz0zv21f4uhzY');

// API Endpoints Configuration
export const API_ENDPOINTS = {
  // Primary API (port 8000) endpoints
  PRIMARY: {
    BASE_URL: PRIMARY_API_BASE_URL,
    WS_URL: PRIMARY_WS_URL,
    ENDPOINTS: {
      FACE_DETECTION: '/detect/faces/detect/image',
      FACE_IMAGES_PRESIGNED: '/api/face-images/presigned-urls',
      FACE_IMAGE_SINGLE: '/api/face-images',
      VIDEO_JOBS: '/submit_videos',
      VIDEO_RESULTS: '/video_results',
      VECTOR_SEARCH: '/api/vector-search',
      IMAGE_UPLOAD: '/api/upload',
      HEALTH: '/health',
      WEBSOCKET_JOBS: '/ws/jobs',
      WEBSOCKET_VIDEO_PROCESSING: '/ws/video-processing'
    }
  },
  
  // Secondary API (port 8001) endpoints  
  SECONDARY: {
    BASE_URL: SECONDARY_API_BASE_URL,
    WS_URL: SECONDARY_WS_URL,
    ENDPOINTS: {
      INSIGHTFACE_DETECTION: '/detect/faces/insightface',
      HEALTH: '/health'
    }
  }
};

// Helper functions for building full URLs
export const buildUrl = (baseUrl, endpoint) => {
  if (!baseUrl || !endpoint) {
    console.warn('buildUrl called with missing parameters:', { baseUrl, endpoint });
    return baseUrl || '';
  }
  const cleanBase = baseUrl.replace(/\/$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${cleanBase}${cleanEndpoint}`;
};

export const getPrimaryApiUrl = (endpoint) => {
  if (!endpoint) {
    console.warn('getPrimaryApiUrl called with undefined endpoint');
    return API_ENDPOINTS.PRIMARY.BASE_URL;
  }
  return buildUrl(API_ENDPOINTS.PRIMARY.BASE_URL, endpoint);
};

export const getSecondaryApiUrl = (endpoint) => {
  if (!endpoint) {
    console.warn('getSecondaryApiUrl called with undefined endpoint');
    return API_ENDPOINTS.SECONDARY.BASE_URL;
  }
  return buildUrl(API_ENDPOINTS.SECONDARY.BASE_URL, endpoint);
};

// WebSocket URL builders
export const getPrimaryWebSocketUrl = (endpoint) => {
  return buildUrl(API_ENDPOINTS.PRIMARY.WS_URL, endpoint);
};

export const getSecondaryWebSocketUrl = (endpoint) => {
  return buildUrl(API_ENDPOINTS.SECONDARY.WS_URL, endpoint);
};

// Default axios configurations
export const DEFAULT_AXIOS_CONFIG = {
  timeout: 10000,
  withCredentials: false,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  }
};

// Development mode helper
export const isDevelopment = () => {
  return getEnvVar('NODE_ENV', 'development') === 'development' || 
         getEnvVar('DEV', 'false') === 'true';
};

// Log configuration in development
if (isDevelopment()) {
  console.log('API Configuration:', {
    PRIMARY_API_BASE_URL,
    SECONDARY_API_BASE_URL,
    PRIMARY_WS_URL,
    SECONDARY_WS_URL,
    API_KEY: API_KEY ? '***configured***' : 'not configured'
  });
}

export default {
  API_ENDPOINTS,
  PRIMARY_API_BASE_URL,
  SECONDARY_API_BASE_URL,
  PRIMARY_WS_URL,
  SECONDARY_WS_URL,
  API_KEY,
  buildUrl,
  getPrimaryApiUrl,
  getSecondaryApiUrl,
  getPrimaryWebSocketUrl,
  getSecondaryWebSocketUrl,
  DEFAULT_AXIOS_CONFIG,
  isDevelopment
};
