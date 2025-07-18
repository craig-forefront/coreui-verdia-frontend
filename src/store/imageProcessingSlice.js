import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunk for uploading images
export const uploadImage = createAsyncThunk(
    'imageProcessing/uploadImage',
    async (file, { rejectWithValue, signal }) => {
        try {
            // Create FormData for the upload
            const formData = new FormData();
            formData.append('image', file);
            
            // Configure upload with progress tracking
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                signal, // Support for cancellation
                onUploadProgress: (progressEvent) => {
                    // Progress is handled by the component's upload hook
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    // Dispatch progress updates if needed
                },
            };
            
            // Upload to your API endpoint
            const response = await axios.post('/api/images/upload', formData, config);
            
            return {
                imageId: response.data.id,
                url: response.data.url,
                uploadedAt: new Date().toISOString(),
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
                metadata: response.data.metadata || {}
            };
        } catch (error) {
            if (axios.isCancel(error)) {
                return rejectWithValue('Upload cancelled');
            }
            
            const message = error.response?.data?.message || error.message || 'Upload failed';
            return rejectWithValue(message);
        }
    }
);

// Async thunk for face detection
export const detectFaces = createAsyncThunk(
    'imageProcessing/detectFaces',
    async (imageFile, { rejectWithValue, getState, signal }) => {
        try {
            const formData = new FormData();
            formData.append('image', imageFile);
            
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                signal,
                timeout: 30000, // 30 second timeout for face detection
            };
            
            // Use your face detection API endpoint
            const response = await axios.post('/api/faces/detect', formData, config);
            
            return {
                detectionId: response.data.id,
                faces: response.data.faces || [],
                detectedAt: new Date().toISOString(),
                imageMetadata: {
                    width: response.data.image_width,
                    height: response.data.image_height,
                    fileName: imageFile.name
                },
                processingTime: response.data.processing_time,
                confidence: response.data.confidence || {},
                landmarks: response.data.landmarks || []
            };
        } catch (error) {
            if (axios.isCancel(error)) {
                return rejectWithValue('Face detection cancelled');
            }
            
            const message = error.response?.data?.message || error.message || 'Face detection failed';
            return rejectWithValue(message);
        }
    }
);

// Async thunk for batch image processing
export const processBatchImages = createAsyncThunk(
    'imageProcessing/processBatch',
    async (files, { rejectWithValue, dispatch, signal }) => {
        try {
            const results = [];
            
            for (const file of files) {
                // Upload each file
                const uploadResult = await dispatch(uploadImage(file)).unwrap();
                
                // Detect faces for each uploaded image
                const detectionResult = await dispatch(detectFaces(file)).unwrap();
                
                results.push({
                    upload: uploadResult,
                    detection: detectionResult,
                    file: {
                        name: file.name,
                        size: file.size,
                        type: file.type
                    }
                });
            }
            
            return results;
        } catch (error) {
            return rejectWithValue(error.message || 'Batch processing failed');
        }
    }
);

// Initial state
const initialState = {
    // Current image being processed
    currentImage: null,
    
    // Upload status and progress
    uploadStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    uploadProgress: 0,
    uploadError: null,
    
    // Face detection results
    detectionResults: null,
    detectionStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    detectionError: null,
    
    // Batch processing
    batchProcessing: {
        status: 'idle',
        progress: 0,
        results: [],
        error: null,
        totalFiles: 0,
        processedFiles: 0
    },
    
    // Image history and cache
    imageHistory: [],
    recentUploads: [],
    
    // Processing settings
    settings: {
        enableFaceDetection: true,
        detectionThreshold: 0.5,
        maxImageSize: 10 * 1024 * 1024, // 10MB
        supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
        enableImageOptimization: true,
        optimizationQuality: 0.9,
        enableBatchProcessing: false,
        maxBatchSize: 10
    },
    
    // Performance metrics
    metrics: {
        totalUploads: 0,
        totalDetections: 0,
        averageUploadTime: 0,
        averageDetectionTime: 0,
        successRate: 0,
        lastUpdated: null
    }
};

// Create the slice
const imageProcessingSlice = createSlice({
    name: 'imageProcessing',
    initialState,
    reducers: {
        // Set current image data
        setCurrentImage: (state, action) => {
            state.currentImage = action.payload;
        },
        
        // Clear current image
        clearCurrentImage: (state) => {
            state.currentImage = null;
            state.uploadStatus = 'idle';
            state.uploadError = null;
        },
        
        // Clear detection results
        clearImageResults: (state) => {
            state.detectionResults = null;
            state.detectionStatus = 'idle';
            state.detectionError = null;
        },
        
        // Update upload progress
        updateUploadProgress: (state, action) => {
            state.uploadProgress = action.payload;
        },
        
        // Set upload error
        setUploadError: (state, action) => {
            state.uploadError = action.payload;
            state.uploadStatus = 'failed';
        },
        
        // Set detection error
        setDetectionError: (state, action) => {
            state.detectionError = action.payload;
            state.detectionStatus = 'failed';
        },
        
        // Update processing settings
        updateSettings: (state, action) => {
            state.settings = { ...state.settings, ...action.payload };
        },
        
        // Add to image history
        addToHistory: (state, action) => {
            const entry = {
                ...action.payload,
                timestamp: new Date().toISOString(),
                id: Date.now().toString()
            };
            
            state.imageHistory.unshift(entry);
            
            // Keep only last 50 entries
            if (state.imageHistory.length > 50) {
                state.imageHistory = state.imageHistory.slice(0, 50);
            }
        },
        
        // Clear history
        clearHistory: (state) => {
            state.imageHistory = [];
        },
        
        // Update metrics
        updateMetrics: (state, action) => {
            state.metrics = { 
                ...state.metrics, 
                ...action.payload,
                lastUpdated: new Date().toISOString()
            };
        },
        
        // Reset all state
        resetImageProcessing: (state) => {
            return { ...initialState };
        }
    },
    extraReducers: (builder) => {
        // Upload image cases
        builder
            .addCase(uploadImage.pending, (state) => {
                state.uploadStatus = 'loading';
                state.uploadError = null;
                state.uploadProgress = 0;
            })
            .addCase(uploadImage.fulfilled, (state, action) => {
                state.uploadStatus = 'succeeded';
                state.uploadProgress = 100;
                
                // Add to recent uploads
                state.recentUploads.unshift(action.payload);
                if (state.recentUploads.length > 10) {
                    state.recentUploads = state.recentUploads.slice(0, 10);
                }
                
                // Update metrics
                state.metrics.totalUploads += 1;
            })
            .addCase(uploadImage.rejected, (state, action) => {
                state.uploadStatus = 'failed';
                state.uploadError = action.payload;
                state.uploadProgress = 0;
            });
        
        // Face detection cases
        builder
            .addCase(detectFaces.pending, (state) => {
                state.detectionStatus = 'loading';
                state.detectionError = null;
            })
            .addCase(detectFaces.fulfilled, (state, action) => {
                state.detectionStatus = 'succeeded';
                state.detectionResults = action.payload;
                
                // Add to history
                const historyEntry = {
                    type: 'face_detection',
                    results: action.payload,
                    success: true
                };
                
                state.imageHistory.unshift({
                    ...historyEntry,
                    timestamp: new Date().toISOString(),
                    id: Date.now().toString()
                });
                
                // Update metrics
                state.metrics.totalDetections += 1;
            })
            .addCase(detectFaces.rejected, (state, action) => {
                state.detectionStatus = 'failed';
                state.detectionError = action.payload;
                
                // Add failure to history
                state.imageHistory.unshift({
                    type: 'face_detection',
                    error: action.payload,
                    success: false,
                    timestamp: new Date().toISOString(),
                    id: Date.now().toString()
                });
            });
        
        // Batch processing cases
        builder
            .addCase(processBatchImages.pending, (state, action) => {
                state.batchProcessing.status = 'loading';
                state.batchProcessing.error = null;
                state.batchProcessing.totalFiles = action.meta.arg.length;
                state.batchProcessing.processedFiles = 0;
                state.batchProcessing.results = [];
            })
            .addCase(processBatchImages.fulfilled, (state, action) => {
                state.batchProcessing.status = 'succeeded';
                state.batchProcessing.results = action.payload;
                state.batchProcessing.processedFiles = action.payload.length;
                state.batchProcessing.progress = 100;
            })
            .addCase(processBatchImages.rejected, (state, action) => {
                state.batchProcessing.status = 'failed';
                state.batchProcessing.error = action.payload;
            });
    }
});

// Export actions
export const {
    setCurrentImage,
    clearCurrentImage,
    clearImageResults,
    updateUploadProgress,
    setUploadError,
    setDetectionError,
    updateSettings,
    addToHistory,
    clearHistory,
    updateMetrics,
    resetImageProcessing
} = imageProcessingSlice.actions;

// Selectors
export const selectCurrentImage = (state) => state.imageProcessing.currentImage;
export const selectImageUploadStatus = (state) => state.imageProcessing.uploadStatus;
export const selectImageUploadProgress = (state) => state.imageProcessing.uploadProgress;
export const selectImageUploadError = (state) => state.imageProcessing.uploadError;

export const selectDetectionResults = (state) => state.imageProcessing.detectionResults;
export const selectDetectionStatus = (state) => state.imageProcessing.detectionStatus;
export const selectDetectionError = (state) => state.imageProcessing.detectionError;

export const selectBatchProcessing = (state) => state.imageProcessing.batchProcessing;
export const selectImageHistory = (state) => state.imageProcessing.imageHistory;
export const selectRecentUploads = (state) => state.imageProcessing.recentUploads;
export const selectProcessingSettings = (state) => state.imageProcessing.settings;
export const selectProcessingMetrics = (state) => state.imageProcessing.metrics;

// Complex selectors
export const selectIsProcessing = (state) => 
    state.imageProcessing.uploadStatus === 'loading' || 
    state.imageProcessing.detectionStatus === 'loading';

export const selectCanUpload = (state) => 
    state.imageProcessing.uploadStatus !== 'loading' &&
    state.imageProcessing.detectionStatus !== 'loading';

export const selectSuccessfulDetections = (state) => 
    state.imageProcessing.imageHistory.filter(entry => 
        entry.type === 'face_detection' && entry.success
    );

export const selectFailedOperations = (state) => 
    state.imageProcessing.imageHistory.filter(entry => !entry.success);

export const selectImageUploadPreferences = (state) => ({
    enablePreview: true,
    autoDetectFaces: state.imageProcessing.settings.enableFaceDetection,
    showUploadProgress: true,
    maxFileSize: state.imageProcessing.settings.maxImageSize,
    enableNotifications: true,
    retryOnFailure: true,
    maxRetries: 3,
    imageQuality: state.imageProcessing.settings.optimizationQuality,
    enableImageOptimization: state.imageProcessing.settings.enableImageOptimization,
    acceptedFormats: state.imageProcessing.settings.supportedFormats,
    enableDragDrop: true,
    autoNavigateOnSuccess: true,
    enableImageValidation: true
});

export default imageProcessingSlice.reducer;
