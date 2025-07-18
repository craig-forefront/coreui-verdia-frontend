import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import faceApiService from '../services/faceApiService'

// Async thunks for face processing
export const detectFaces = createAsyncThunk(
  'faceProcessing/detectFaces',
  async (imageFile, { rejectWithValue }) => {
    try {
      const formData = new FormData()
      formData.append('file', imageFile)
      const response = await faceApiService.detectFacesInsightFace(formData)
      return response
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const generateEmbedding = createAsyncThunk(
  'faceProcessing/generateEmbedding',
  async ({ imageFile, bbox, keyPoints }, { rejectWithValue }) => {
    try {
      const result = await faceApiService.generateManualEmbeddingWithKeyPoints(
        imageFile, bbox, keyPoints
      )
      return result
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

const initialState = {
  // Current image being processed
  currentImage: {
    file: null,
    preview: null,
    dimensions: { width: 0, height: 0 }
  },
  
  // Face detection results
  detectedFaces: [],
  autoDetectCompleted: false,
  
  // Manual annotations
  manualBbox: null,
  manualKeyPoints: [],
  isDrawing: false,
  isMarkingKeyPoints: false,
  
  // Processing states
  isDetecting: false,
  isGeneratingEmbedding: false,
  
  // Results
  embeddingResults: [],
  
  // UI state for manual embedding
  drawingState: {
    start: null,
    current: null
  },
  
  // Error and success states
  error: null,
  success: null,
  
  // Processing status
  status: 'idle' // 'idle' | 'detecting' | 'embedding' | 'completed' | 'failed'
}

const faceProcessingSlice = createSlice({
  name: 'faceProcessing',
  initialState,
  reducers: {
    // Image management
    setCurrentImage: (state, action) => {
      const { file, preview, dimensions } = action.payload
      state.currentImage = { file, preview, dimensions }
      // Reset other states when new image is set
      state.detectedFaces = []
      state.autoDetectCompleted = false
      state.manualBbox = null
      state.manualKeyPoints = []
      state.embeddingResults = []
      state.error = null
      state.success = null
    },
    
    clearCurrentImage: (state) => {
      state.currentImage = initialState.currentImage
      state.detectedFaces = []
      state.autoDetectCompleted = false
      state.manualBbox = null
      state.manualKeyPoints = []
      state.embeddingResults = []
      state.error = null
      state.success = null
    },
    
    // Manual annotation actions
    setManualBbox: (state, action) => {
      state.manualBbox = action.payload
    },
    
    setManualKeyPoints: (state, action) => {
      state.manualKeyPoints = action.payload
    },
    
    addKeyPoint: (state, action) => {
      const { x, y, type } = action.payload
      state.manualKeyPoints.push({ x, y, type })
    },
    
    removeLastKeyPoint: (state) => {
      state.manualKeyPoints.pop()
    },
    
    clearKeyPoints: (state) => {
      state.manualKeyPoints = []
    },
    
    // Drawing state management
    setIsDrawing: (state, action) => {
      state.isDrawing = action.payload
    },
    
    setIsMarkingKeyPoints: (state, action) => {
      state.isMarkingKeyPoints = action.payload
    },
    
    setDrawingState: (state, action) => {
      state.drawingState = { ...state.drawingState, ...action.payload }
    },
    
    // Results management
    addEmbeddingResult: (state, action) => {
      state.embeddingResults.push(action.payload)
    },
    
    clearEmbeddingResults: (state) => {
      state.embeddingResults = []
    },
    
    // Error and success management
    setError: (state, action) => {
      state.error = action.payload
      state.success = null
    },
    
    setSuccess: (state, action) => {
      state.success = action.payload
      state.error = null
    },
    
    clearMessages: (state) => {
      state.error = null
      state.success = null
    }
  },
  
  extraReducers: (builder) => {
    builder
      // Detect faces
      .addCase(detectFaces.pending, (state) => {
        state.status = 'detecting'
        state.isDetecting = true
        state.error = null
      })
      .addCase(detectFaces.fulfilled, (state, action) => {
        state.status = 'completed'
        state.isDetecting = false
        state.detectedFaces = action.payload.faces || []
        state.autoDetectCompleted = true
        state.success = 'Faces detected successfully'
      })
      .addCase(detectFaces.rejected, (state, action) => {
        state.status = 'failed'
        state.isDetecting = false
        state.error = action.payload || 'Failed to detect faces'
      })
      
      // Generate embedding
      .addCase(generateEmbedding.pending, (state) => {
        state.status = 'embedding'
        state.isGeneratingEmbedding = true
        state.error = null
      })
      .addCase(generateEmbedding.fulfilled, (state, action) => {
        state.status = 'completed'
        state.isGeneratingEmbedding = false
        state.embeddingResults.push(action.payload)
        state.success = 'Embedding generated successfully'
      })
      .addCase(generateEmbedding.rejected, (state, action) => {
        state.status = 'failed'
        state.isGeneratingEmbedding = false
        state.error = action.payload || 'Failed to generate embedding'
      })
  }
})

export const {
  setCurrentImage,
  clearCurrentImage,
  setManualBbox,
  setManualKeyPoints,
  addKeyPoint,
  removeLastKeyPoint,
  clearKeyPoints,
  setIsDrawing,
  setIsMarkingKeyPoints,
  setDrawingState,
  addEmbeddingResult,
  clearEmbeddingResults,
  setError,
  setSuccess,
  clearMessages
} = faceProcessingSlice.actions

// Selectors
export const selectCurrentImage = (state) => state.faceProcessing.currentImage
export const selectDetectedFaces = (state) => state.faceProcessing.detectedFaces
export const selectManualBbox = (state) => state.faceProcessing.manualBbox
export const selectManualKeyPoints = (state) => state.faceProcessing.manualKeyPoints
export const selectIsDrawing = (state) => state.faceProcessing.isDrawing
export const selectIsMarkingKeyPoints = (state) => state.faceProcessing.isMarkingKeyPoints
export const selectIsDetecting = (state) => state.faceProcessing.isDetecting
export const selectIsGeneratingEmbedding = (state) => state.faceProcessing.isGeneratingEmbedding
export const selectEmbeddingResults = (state) => state.faceProcessing.embeddingResults
export const selectError = (state) => state.faceProcessing.error
export const selectSuccess = (state) => state.faceProcessing.success
export const selectProcessingStatus = (state) => state.faceProcessing.status

// Additional action creators for convenience
export const clearError = () => setError(null)
export const clearResults = () => clearEmbeddingResults()

export default faceProcessingSlice.reducer
