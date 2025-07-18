import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  // Modal states
  modals: {
    faceDetail: {
      isOpen: false,
      selectedGroup: null
    },
    faceDetailModal: {
      isOpen: false,
      selectedGroup: null
    },
    deleteConfirm: {
      isOpen: false,
      itemToDelete: null
    },
    keyboardHelp: {
      isOpen: false
    }
  },
  
  // Selection states
  selections: {
    faces: [],
  },
  
  // UI modes
  selectMode: false,
  
  // Filter states for different views
  filters: {
    faceComparison: {
      minAge: '',
      maxAge: '',
      sex: '',
      minScore: '',
      largestImage: ''
    },
    detections: {
      selectedBoxes: [],
      largestOnly: false,
      ageRange: [18, 100],
      nameScore: [80, 100],
      detectionScore: [60, 100]
    },
    topScores: {
      isFiltering: false,
      currentResultsCount: 0
    }
  },
  
  // Loading states
  loading: {
    images: {},
    faceProcessing: false,
    uploads: {}
  },
  
  // UI preferences
  preferences: {
    showDetectedFaces: true,
    showKeyPoints: true,
    colorMode: 'auto',
    showKeyboardHelp: false
  }
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Modal actions
    openModal: (state, action) => {
      const { modalType, data } = action.payload
      state.modals[modalType].isOpen = true
      if (data) {
        Object.assign(state.modals[modalType], data)
      }
    },
    closeModal: (state, action) => {
      const { modalType } = action.payload
      state.modals[modalType].isOpen = false
      // Reset modal data
      Object.keys(state.modals[modalType]).forEach(key => {
        if (key !== 'isOpen') {
          state.modals[modalType][key] = null
        }
      })
    },
    
    // Selection actions
    setFaceSelection: (state, action) => {
      state.selections.faces = action.payload
    },
    toggleFaceSelection: (state, action) => {
      const faceId = action.payload
      const index = state.selections.faces.indexOf(faceId)
      if (index > -1) {
        state.selections.faces.splice(index, 1)
      } else {
        state.selections.faces.push(faceId)
      }
    },
    setSelectMode: (state, action) => {
      state.selectMode = action.payload
      if (!action.payload) {
        state.selections.faces = []
      }
    },
    
    // Filter actions
    setFilters: (state, action) => {
      const { viewType, filters } = action.payload
      state.filters[viewType] = { ...state.filters[viewType], ...filters }
    },
    resetFilters: (state, action) => {
      const { viewType } = action.payload
      const initialFilters = initialState.filters[viewType]
      state.filters[viewType] = { ...initialFilters }
    },
    
    // Loading actions
    setImageLoading: (state, action) => {
      const { imageId, loading } = action.payload
      state.loading.images[imageId] = loading
    },
    setFaceProcessing: (state, action) => {
      state.loading.faceProcessing = action.payload
    },
    setUploadLoading: (state, action) => {
      const { uploadId, loading } = action.payload
      state.loading.uploads[uploadId] = loading
    },
    
    // Preferences actions
    updatePreferences: (state, action) => {
      state.preferences = { ...state.preferences, ...action.payload }
    }
  }
})

export const {
  openModal,
  closeModal,
  setFaceSelection,
  toggleFaceSelection,
  setSelectMode,
  setFilters,
  resetFilters,
  setImageLoading,
  setFaceProcessing,
  setUploadLoading,
  updatePreferences
} = uiSlice.actions

// Additional action creators for the refactored components
export const setSelectedFaces = (faces) => setFaceSelection(faces)
export const clearFaceSelection = () => setFaceSelection([])
export const selectAllFaces = (faceIds) => setFaceSelection(faceIds)
export const deselectAllFaces = () => setFaceSelection([])
export const toggleSelectMode = () => (dispatch, getState) => {
  const currentMode = getState().ui.selectMode || false
  dispatch(setSelectMode(!currentMode))
}
export const setFaceDetailModalOpen = (isOpen) => 
  isOpen ? openModal({ modalType: 'faceDetailModal' }) : closeModal({ modalType: 'faceDetailModal' })
export const toggleKeyboardHelp = () => (dispatch, getState) => {
  const currentState = getState().ui.preferences?.showKeyboardHelp || false
  dispatch(updatePreferences({ showKeyboardHelp: !currentState }))
}

// Selectors
export const selectSelectedFaces = (state) => state.ui.selections?.faces || []
export const selectSelectedFace = (state) => state.ui.selections?.selectedFace
export const selectCurrentView = (state) => state.ui.currentView
export const selectIsSidebarOpen = (state) => state.ui.isSidebarOpen
export const selectActiveFilters = (state) => state.ui.filters
export const selectIsSelectMode = (state) => state.ui.selectMode || false
export const selectKeyboardHelpVisible = (state) => state.ui.preferences?.showKeyboardHelp || false

// Modal selectors  
export const selectIsImageModalOpen = (state) => state.ui.modals?.imageModal?.isOpen || false
export const selectIsFaceDetailModalOpen = (state) => state.ui.modals?.faceDetailModal?.isOpen || false
export const selectIsVideoModalOpen = (state) => state.ui.modals?.videoModal?.isOpen || false
export const selectIsConfirmModalOpen = (state) => state.ui.modals?.confirmModal?.isOpen || false

export default uiSlice.reducer
