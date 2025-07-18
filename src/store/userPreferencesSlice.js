import { createSlice } from '@reduxjs/toolkit'

// Load preferences from localStorage
const loadPreferencesFromStorage = () => {
  try {
    const savedPreferences = localStorage.getItem('userPreferences')
    return savedPreferences ? JSON.parse(savedPreferences) : {}
  } catch (error) {
    console.warn('Failed to load preferences from localStorage:', error)
    return {}
  }
}

// Save preferences to localStorage
const savePreferencesToStorage = (preferences) => {
  try {
    localStorage.setItem('userPreferences', JSON.stringify(preferences))
  } catch (error) {
    console.warn('Failed to save preferences to localStorage:', error)
  }
}

const initialState = {
  // Theme preferences
  theme: {
    colorMode: 'auto', // 'light', 'dark', 'auto'
    primaryColor: '#321fdb',
    sidebarColorScheme: 'dark'
  },
  
  // Display preferences
  display: {
    showDetectedFaces: true,
    showKeyPoints: true,
    showBoundingBoxes: true,
    imageQuality: 'high', // 'low', 'medium', 'high'
    thumbnailSize: 'medium', // 'small', 'medium', 'large'
    itemsPerPage: 20
  },
  
  // Face processing preferences
  faceProcessing: {
    autoDetectOnUpload: true,
    defaultConfidenceThreshold: 0.8,
    maxFacesPerImage: 10,
    preferredDetectionModel: 'insightface'
  },
  
  // Search preferences
  search: {
    defaultSortOrder: 'relevance', // 'relevance', 'date', 'score'
    autoLoadMore: true,
    resultsPerPage: 50,
    saveSearchHistory: true
  },
  
  // Video processing preferences
  video: {
    defaultProcessingQuality: 'high',
    autoStartProcessing: false,
    notifyOnCompletion: true
  },

  // Video upload preferences  
  videoUpload: {
    autoStartProcessing: true,
    showUploadProgress: true,
    maxFileSize: 500 * 1024 * 1024, // 500MB
    enableNotifications: true,
    retryOnFailure: true,
    maxRetries: 3,
    chunkSize: 5 * 1024 * 1024, // 5MB chunks
    acceptedFormats: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'],
    enableDragDrop: true,
    autoValidateFiles: true
  },

  // Video selector preferences
  videoSelector: {
    viewMode: 'grid', // 'grid', 'list'
    gridSize: 'medium', // 'small', 'medium', 'large'
    sortBy: 'name', // 'name', 'date', 'duration', 'size', 'status'
    sortOrder: 'asc', // 'asc', 'desc'
    filterBy: 'all', // 'all', 'processed', 'processing', 'error'
    showPreview: true,
    autoPlay: false,
    enableBulkActions: true,
    itemsPerPage: 20,
    enableVirtualization: true,
    enableThumbnails: true,
    showMetadata: true,
    enableSearch: true,
    enableFilters: true
  },
  
  // UI layout preferences
  layout: {
    sidebarCollapsed: false,
    showBreadcrumbs: true,
    compactMode: false,
    showTooltips: true
  },
  
  // Keyboard shortcuts
  shortcuts: {
    enabled: true,
    customShortcuts: {}
  },
  
  // Load saved preferences
  ...loadPreferencesFromStorage()
}

const userPreferencesSlice = createSlice({
  name: 'userPreferences',
  initialState,
  reducers: {
    updateThemePreferences: (state, action) => {
      state.theme = { ...state.theme, ...action.payload }
      savePreferencesToStorage(state)
    },
    
    updateDisplayPreferences: (state, action) => {
      state.display = { ...state.display, ...action.payload }
      savePreferencesToStorage(state)
    },
    
    updateFaceProcessingPreferences: (state, action) => {
      state.faceProcessing = { ...state.faceProcessing, ...action.payload }
      savePreferencesToStorage(state)
    },
    
    updateSearchPreferences: (state, action) => {
      state.search = { ...state.search, ...action.payload }
      savePreferencesToStorage(state)
    },
    
    updateVideoPreferences: (state, action) => {
      state.video = { ...state.video, ...action.payload }
      savePreferencesToStorage(state)
    },

    updateVideoUploadPreferences: (state, action) => {
      state.videoUpload = { ...state.videoUpload, ...action.payload }
      savePreferencesToStorage(state)
    },

    updateVideoSelectorPreferences: (state, action) => {
      state.videoSelector = { ...state.videoSelector, ...action.payload }
      savePreferencesToStorage(state)
    },
    
    updateLayoutPreferences: (state, action) => {
      state.layout = { ...state.layout, ...action.payload }
      savePreferencesToStorage(state)
    },
    
    updateShortcutPreferences: (state, action) => {
      state.shortcuts = { ...state.shortcuts, ...action.payload }
      savePreferencesToStorage(state)
    },
    
    updateAllPreferences: (state, action) => {
      Object.keys(action.payload).forEach(key => {
        if (state[key]) {
          state[key] = { ...state[key], ...action.payload[key] }
        }
      })
      savePreferencesToStorage(state)
    },
    
    resetPreferences: (state, action) => {
      const { category } = action.payload
      if (category && initialState[category]) {
        state[category] = { ...initialState[category] }
      } else {
        // Reset all preferences
        Object.keys(initialState).forEach(key => {
          state[key] = { ...initialState[key] }
        })
      }
      savePreferencesToStorage(state)
    },
    
    importPreferences: (state, action) => {
      const importedPreferences = action.payload
      Object.keys(importedPreferences).forEach(key => {
        if (state[key]) {
          state[key] = { ...state[key], ...importedPreferences[key] }
        }
      })
      savePreferencesToStorage(state)
    }
  }
})

export const {
  updateThemePreferences,
  updateDisplayPreferences,
  updateFaceProcessingPreferences,
  updateSearchPreferences,
  updateVideoPreferences,
  updateVideoUploadPreferences,
  updateVideoSelectorPreferences,
  updateLayoutPreferences,
  updateShortcutPreferences,
  updateAllPreferences,
  resetPreferences,
  importPreferences
} = userPreferencesSlice.actions

// Selectors
export const selectThemePreferences = (state) => state.userPreferences.theme
export const selectDisplayPreferences = (state) => state.userPreferences.display
export const selectFaceProcessingPreferences = (state) => state.userPreferences.faceProcessing
export const selectProcessingPreferences = (state) => state.userPreferences.faceProcessing // Alias for compatibility
export const selectSearchPreferences = (state) => state.userPreferences.search
export const selectVideoPreferences = (state) => state.userPreferences.video
export const selectVideoUploadPreferences = (state) => state.userPreferences.videoUpload
export const selectVideoSelectorPreferences = (state) => state.userPreferences.videoSelector
export const selectLayoutPreferences = (state) => state.userPreferences.layout
export const selectShortcutPreferences = (state) => state.userPreferences.shortcuts

export default userPreferencesSlice.reducer
