import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import SparkMD5 from 'spark-md5';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const API_KEY = import.meta.env.REACT_APP_API_KEY;

// Function to calculate MD5 hash of a file
const calculateMD5 = (file) => {
    return new Promise((resolve, reject) => {
        const chunkSize = 2097152; // 2MB chunks
        const spark = new SparkMD5.ArrayBuffer();
        const fileReader = new FileReader();
        let currentChunk = 0;
        const chunks = Math.ceil(file.size / chunkSize);

        fileReader.onload = (e) => {
            spark.append(e.target.result); // Append array buffer
            currentChunk++;

            if (currentChunk < chunks) {
                loadNext();
            } else {
                const md5Hash = spark.end(); // Complete the hash computation
                resolve(md5Hash);
            }
        };

        fileReader.onerror = (error) => {
            reject(error);
        };

        function loadNext() {
            const start = currentChunk * chunkSize;
            const end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;
            fileReader.readAsArrayBuffer(file.slice(start, end));
        }

        loadNext();
    });
};

// Async thunk for direct upload through the backend API
export const uploadVideo = createAsyncThunk(
    'video/uploadVideo',
    async (file, { rejectWithValue }) => {
        try {
            // Calculate MD5 hash of the file
            const md5Hash = await calculateMD5(file);
            
            // Create FormData object for the file upload
            const formData = new FormData();
            formData.append('file', file);
            formData.append('md5_hash', md5Hash);
            formData.append('original_filename', file.name);
            
            // Upload directly to the backend API endpoint
            const response = await axios.post(
                `${API_URL}/api/videos/upload`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'X-API-Key': API_KEY
                    },
                    onUploadProgress: (progressEvent) => {
                        // You could dispatch progress updates here if needed
                        console.log(`Upload progress: ${Math.round((progressEvent.loaded * 100) / progressEvent.total)}%`);
                    }
                }
            );
            
            // Start processing the uploaded video
            const { video_id } = response.data;
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || { detail: error.message });
        }
    }
);

// Async thunk for starting video processing
export const startProcessing = createAsyncThunk(
    'video/startProcessing',
    async (videoId, { rejectWithValue }) => {
        try {
            const response = await axios.post(`${API_URL}/api/videos/${videoId}/process`, {}, {
                headers: {
                    'X-API-Key': API_KEY
                }
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || { detail: error.message });
        }
    }
);

// Async thunk for checking video status
export const checkVideoStatus = createAsyncThunk(
    'video/checkStatus',
    async (videoId, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${API_URL}/api/videos/${videoId}/status`, {
                headers: {
                    'X-API-Key': API_KEY
                }
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || { detail: error.message });
        }
    }
);

// Async thunk to fetch face groups for a video
export const fetchFaceGroups = createAsyncThunk(
    'video/fetchFaceGroups',
    async (videoId, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${API_URL}/api/face-groups/${videoId}/face-groups`, {
                headers: {
                    'X-API-Key': API_KEY
                }
            });
            return { videoId, faceGroups: response.data.face_groups };
        } catch (error) {
            return rejectWithValue(error.response?.data || { detail: error.message });
        }
    }
);

// Async thunk for updating a face group name
export const updateFaceGroupName = createAsyncThunk(
    'video/updateFaceGroupName',
    async ({ videoId, groupId, newName }, { rejectWithValue }) => {
        try {
            const response = await axios.put(
                `${API_URL}/api/face-groups/${groupId}/name?video_id=${videoId}&custom_name=${encodeURIComponent(newName)}`,
                {},
                {
                    headers: {
                        'X-API-Key': API_KEY
                    }
                }
            );
            return { videoId, groupId, newName, response: response.data };
        } catch (error) {
            return rejectWithValue(error.response?.data || { detail: error.message });
        }
    }
);

// Async thunk for moving a face to a different group
export const moveFaceToGroup = createAsyncThunk(
    'video/moveFaceToGroup',
    async ({ videoId, fromGroupId, toGroupId, faceId }, { rejectWithValue }) => {
        try {
            const response = await axios.post(
                `${API_URL}/api/face-groups/${fromGroupId}/move-face?video_id=${videoId}&target_group_id=${toGroupId}&face_id=${faceId}`,
                {},
                {
                    headers: {
                        'X-API-Key': API_KEY
                    }
                }
            );
            return { videoId, fromGroupId, toGroupId, faceId, response: response.data };
        } catch (error) {
            return rejectWithValue(error.response?.data || { detail: error.message });
        }
    }
);

// Async thunk for deleting a face from a group
export const deleteFaceFromGroup = createAsyncThunk(
    'video/deleteFaceFromGroup',
    async ({ videoId, groupId, faceId }, { rejectWithValue }) => {
        try {
            const response = await axios.delete(
                `${API_URL}/api/face-groups/${groupId}/faces/${faceId}?video_id=${videoId}`,
                {
                    headers: {
                        'X-API-Key': API_KEY
                    }
                }
            );
            return { videoId, groupId, faceId, response: response.data };
        } catch (error) {
            return rejectWithValue(error.response?.data || { detail: error.message });
        }
    }
);

// Async thunk for updating face groups (in a real app, this would call an API)
export const updateFaceGroups = createAsyncThunk(
    'video/updateFaceGroups',
    async ({ videoId, faceGroups }, { rejectWithValue }) => {
        try {
            // In a real app, you'd call an API here to update the face groups on the server
            // For now, just return the data to update the Redux store
            return { videoId, faceGroups };
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Add this new thunk for fetching presigned URLs for face images
export const fetchFaceImageUrl = createAsyncThunk(
    'video/fetchFaceImageUrl',
    async (face_id, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${API_URL}/api/face-images/${face_id}`, {
                headers: {
                    'X-API-Key': API_KEY
                }
            });
            return { face_id, url: response.data.url };
        } catch (error) {
            return rejectWithValue(error.response?.data || { detail: error.message });
        }
    }
);

const initialState = {
    videos: {},
    currentUpload: {
        file: null, // This will now store serializable file metadata, not the actual File object
        videoId: null,
        presignedUrl: null,
    },
    uploadStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    processingStatus: {}, // { [videoId]: { status, progress } }
    error: null,
};

const videoSlice = createSlice({
    name: 'video',
    initialState,
    reducers: {
        // Updated to accept serializable file metadata instead of File object
        setCurrentFile(state, action) {
            state.currentUpload.file = action.payload;
        },
        clearCurrentUpload(state) {
            state.currentUpload = {
                file: null,
                videoId: null,
                presignedUrl: null,
            };
            state.uploadStatus = 'idle';
            state.error = null;
        },
        updateProcessingStatus(state, action) {
            // This will be called with WebSocket updates
            const { video_id, status, progress, face_groups, error } = action.payload;
            
            // Update the processing status
            if (!state.processingStatus[video_id]) {
                state.processingStatus[video_id] = {};
            }
            
            state.processingStatus[video_id] = {
                status,
                progress: progress !== undefined ? progress : state.processingStatus[video_id]?.progress || 0,
                error: error || state.processingStatus[video_id]?.error
            };
            
            // Make sure the video exists in state
            if (!state.videos[video_id]) {
                state.videos[video_id] = { 
                    id: video_id,
                    status: status
                };
            } else {
                // Update the video status
                state.videos[video_id].status = status;
            }

            // Handle face groups separately to avoid unnecessary re-renders
            if (face_groups && Array.isArray(face_groups)) {
                // Store face groups with full data
                state.processingStatus[video_id].faceGroups = face_groups;
                state.videos[video_id].faceGroups = face_groups;
            }
            
            // Add a timestamp to prevent stale data
            state.processingStatus[video_id].lastUpdated = Date.now();
        },
        // Local reducers for managing face groups (without API calls)
        updateGroupName(state, action) {
            const { videoId, groupId, newName } = action.payload;
            
            if (state.videos[videoId] && state.videos[videoId].faceGroups) {
                const groupIndex = state.videos[videoId].faceGroups.findIndex(g => g.id === groupId);
                if (groupIndex !== -1) {
                    state.videos[videoId].faceGroups[groupIndex].customName = newName;
                }
            }
        },
        moveFace(state, action) {
            const { videoId, fromGroupId, toGroupId, faceId } = action.payload;
            
            if (state.videos[videoId] && state.videos[videoId].faceGroups) {
                // Find the groups
                const fromGroup = state.videos[videoId].faceGroups.find(g => g.id === fromGroupId);
                const toGroup = state.videos[videoId].faceGroups.find(g => g.id === toGroupId);
                
                // If both groups exist, update face counts
                if (fromGroup && toGroup) {
                    fromGroup.face_count = Math.max(0, fromGroup.face_count - 1);
                    toGroup.face_count = toGroup.face_count + 1;
                    
                    // If real face data exists
                    if (fromGroup.faces && fromGroup.faces.length > 0) {
                        const faceIndex = fromGroup.faces.findIndex(f => f.id === faceId);
                        if (faceIndex !== -1) {
                            const face = fromGroup.faces[faceIndex];
                            // Remove from source group
                            fromGroup.faces.splice(faceIndex, 1);
                            // Add to target group
                            if (!toGroup.faces) toGroup.faces = [];
                            toGroup.faces.push(face);
                        }
                    }
                }
            }
        },
        deleteFace(state, action) {
            const { videoId, groupId, faceId } = action.payload;
            
            if (state.videos[videoId] && state.videos[videoId].faceGroups) {
                const group = state.videos[videoId].faceGroups.find(g => g.id === groupId);
                if (group) {
                    group.face_count = Math.max(0, group.face_count - 1);
                    
                    // Remove the face from group.faces array if real face data exists
                    if (group.faces && group.faces.length > 0) {
                        const faceIndex = group.faces.findIndex(f => f.id === faceId);
                        if (faceIndex !== -1) {
                            group.faces.splice(faceIndex, 1);
                        }
                    }
                }
            }
        },
        reorderGroups(state, action) {
            const { videoId, newOrder } = action.payload;
            
            if (state.videos[videoId] && state.videos[videoId].faceGroups && newOrder) {
                // Create a new array in the specified order
                const reorderedGroups = newOrder.map(id => 
                    state.videos[videoId].faceGroups.find(g => g.id === id)
                ).filter(Boolean);
                
                // Replace the face groups array if we have all items
                if (reorderedGroups.length === state.videos[videoId].faceGroups.length) {
                    state.videos[videoId].faceGroups = reorderedGroups;
                }
            }
        }
    },
    extraReducers: (builder) => {
        builder
            // Handle direct upload
            .addCase(uploadVideo.pending, (state) => {
                state.uploadStatus = 'loading';
                state.error = null;
            })
            .addCase(uploadVideo.fulfilled, (state, action) => {
                state.uploadStatus = 'uploaded';
                const { video_id } = action.payload;
                
                // Initialize the video in our state
                state.videos[video_id] = {
                    id: video_id,
                    fileName: state.currentUpload.file.name,
                    uploadTime: new Date().toISOString(),
                    status: 'pending_processing',
                };
                
                // Start processing automatically
                state.currentUpload.videoId = video_id;
            })
            .addCase(uploadVideo.rejected, (state, action) => {
                state.uploadStatus = 'failed';
                state.error = action.payload?.detail || 'Failed to upload video';
            })

            // Handle processing start
            .addCase(startProcessing.fulfilled, (state, action) => {
                const { video_id, task_id } = action.payload;
                if (state.videos[video_id]) {
                    state.videos[video_id].taskId = task_id;
                    state.videos[video_id].status = 'processing';
                }
                state.processingStatus[video_id] = {
                    status: 'processing',
                    progress: 0,
                    taskId: task_id
                };
            })
            .addCase(startProcessing.rejected, (state, action) => {
                const videoId = action.meta.arg;
                if (state.videos[videoId]) {
                    state.videos[videoId].status = 'processing_failed';
                    state.videos[videoId].error = action.payload?.detail || 'Failed to start processing';
                }
            })

            // Handle status check
            .addCase(checkVideoStatus.fulfilled, (state, action) => {
                const { video_id, status, progress, face_groups } = action.payload;
                if (state.videos[video_id]) {
                    state.videos[video_id].status = status;
                    if (face_groups) {
                        state.videos[video_id].faceGroups = face_groups;
                    }
                }
                state.processingStatus[video_id] = {
                    status,
                    progress,
                    faceGroups: face_groups || state.processingStatus[video_id]?.faceGroups
                };
            })
            
            // Handle face groups fetch
            .addCase(fetchFaceGroups.fulfilled, (state, action) => {
                const { videoId, faceGroups } = action.payload;
                if (state.videos[videoId]) {
                    state.videos[videoId].faceGroups = faceGroups;
                }
                if (!state.processingStatus[videoId]) {
                    state.processingStatus[videoId] = {};
                }
                state.processingStatus[videoId].faceGroups = faceGroups;
            })
            
            // Handle face group name update
            .addCase(updateFaceGroupName.fulfilled, (state, action) => {
                const { videoId, groupId, newName } = action.payload;
                if (state.videos[videoId] && state.videos[videoId].faceGroups) {
                    const group = state.videos[videoId].faceGroups.find(g => g.id === groupId);
                    if (group) {
                        group.customName = newName;
                    }
                }
            })
            
            // Handle move face between groups
            .addCase(moveFaceToGroup.fulfilled, (state, action) => {
                const { videoId, fromGroupId, toGroupId, response } = action.payload;
                if (state.videos[videoId] && state.videos[videoId].faceGroups) {
                    const fromGroup = state.videos[videoId].faceGroups.find(g => g.id === fromGroupId);
                    const toGroup = state.videos[videoId].faceGroups.find(g => g.id === toGroupId);
                    
                    if (fromGroup && toGroup && response.success) {
                        // Update face counts based on response
                        fromGroup.face_count = response.source_group.face_count;
                        toGroup.face_count = response.target_group.face_count;
                    }
                }
            })
            
            // Handle delete face
            .addCase(deleteFaceFromGroup.fulfilled, (state, action) => {
                const { videoId, groupId, response } = action.payload;
                if (state.videos[videoId] && state.videos[videoId].faceGroups && response.success) {
                    const group = state.videos[videoId].faceGroups.find(g => g.id === groupId);
                    if (group) {
                        group.face_count = response.face_count;
                    }
                }
            })
            
            // Handle face groups update
            .addCase(updateFaceGroups.fulfilled, (state, action) => {
                const { videoId, faceGroups } = action.payload;
                if (state.videos[videoId]) {
                    state.videos[videoId].faceGroups = faceGroups;
                }
            })

            // Handle fetch presigned URL for face images
            .addCase(fetchFaceImageUrl.fulfilled, (state, action) => {
                const { face_id, url } = action.payload;
                if (!state.presignedUrls) {
                    state.presignedUrls = {};
                }
                state.presignedUrls[face_id] = url;
            });
    },
});

export const { 
    setCurrentFile, 
    clearCurrentUpload, 
    updateProcessingStatus,
    updateGroupName,
    moveFace,
    deleteFace,
    reorderGroups
} = videoSlice.actions;

// Selectors for the refactored VideoUploader component
export const selectUploadStatus = (state) => state.video.uploadStatus;
export const selectCurrentUpload = (state) => state.video.currentUpload;
export const selectUploadError = (state) => state.video.error;
export const selectProcessingStatus = (state) => state.video.processingStatus;
export const selectVideos = (state) => state.video.videos;
export const selectVideoById = (videoId) => (state) => state.video.videos[videoId];
export const selectPresignedUrls = (state) => state.video.presignedUrls;

// Computed selectors
export const selectIsUploading = (state) => {
    const status = selectUploadStatus(state);
    return status === 'loading' || status === 'uploading';
};

export const selectCanUpload = (state) => {
    const status = selectUploadStatus(state);
    const currentUpload = selectCurrentUpload(state);
    return status === 'idle' && !currentUpload.file;
};

export const selectUploadProgress = (state) => {
    // This would be enhanced to track actual upload progress
    const status = selectUploadStatus(state);
    if (status === 'loading') return 50; // Example progress
    if (status === 'succeeded') return 100;
    return 0;
};

export default videoSlice.reducer;