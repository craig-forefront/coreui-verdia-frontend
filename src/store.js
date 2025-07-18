import { configureStore } from '@reduxjs/toolkit'
import vectorSearchReducer from './store/vectorSearchSlice'
import topScoresReducer from './store/topScoresSlice'
import videoJobsReducer from './store/videoJobsSlice'
import videoReducer from './store/videoSlice'
import searchHistoryReducer from './store/searchHistorySlice'
import uiReducer from './store/uiSlice'
import faceProcessingReducer from './store/faceProcessingSlice'
import userPreferencesReducer from './store/userPreferencesSlice'
import faceGroupsReducer from './store/faceGroupsSlice'
import imageProcessingReducer from './store/imageProcessingSlice'
import webSocketReducer from './store/webSocketSlice'

// Initial state for sidebar and theme
const initialState = {
  sidebarShow: true,
  theme: 'light',
}

// Initial state for banner
const initialStateBanner = {
  bannerText: 'MY//BANNER',
  bannerColor: 'bg-success',
}

// Reducer for sidebar and theme
const changeState = (state = initialState, { type, ...rest }) => {
  switch (type) {
    case 'set':
      return { ...state, ...rest }
    default:
      return state
  }
}

// Reducer for banner
const changeStateBanner = (state = initialStateBanner, action) => {
  switch (action.type) {
    case 'SET_BANNER_TEXT':
      return { ...state, bannerText: action.payload }
    case 'SET_BANNER_COLOR':
      return { ...state, bannerColor: action.payload }
    case 'UPDATE_BANNER':
      return { ...state, ...action.payload }
    default:
      return state
  }
}

// Create store with combined reducers
const store = configureStore({
  reducer: {
    vectorSearch: vectorSearchReducer,
    topScores: topScoresReducer,
    videoJobs: videoJobsReducer, // Add the videoJobsReducer
    video: videoReducer, // Add the videoReducer for face processing functionality
    searchHistory: searchHistoryReducer, // Add the searchHistoryReducer
    ui: uiReducer, // Add UI state management
    faceProcessing: faceProcessingReducer, // Add face processing state management
    userPreferences: userPreferencesReducer, // Add user preferences management
    faceGroups: faceGroupsReducer, // Add face groups search and filtering management
    imageProcessing: imageProcessingReducer, // Add image processing and upload management
    webSocket: webSocketReducer, // Add WebSocket connection and real-time communication management
    app: changeState,
    banner: changeStateBanner,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types as they might contain non-serializable values
        ignoredActions: [
          'video/uploadVideo/pending',
          'video/uploadVideo/fulfilled',
          'video/uploadVideo/rejected',
          'imageProcessing/uploadImage/pending',
          'imageProcessing/uploadImage/fulfilled',
          'imageProcessing/uploadImage/rejected',
          'imageProcessing/detectFaces/pending',
          'imageProcessing/detectFaces/fulfilled',
          'imageProcessing/detectFaces/rejected',
          'webSocket/testConnection/pending',
          'webSocket/testConnection/fulfilled',
          'webSocket/testConnection/rejected',
          'webSocket/reconnectWebSocket/pending',
          'webSocket/reconnectWebSocket/fulfilled',
          'webSocket/reconnectWebSocket/rejected',
        ],
      },
    }),
})

export default store
