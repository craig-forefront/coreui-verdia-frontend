import React, { useCallback, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    CButton,
    CCard,
    CCardBody,
    CCardHeader,
    CCardFooter,
    CProgress,
    CProgressBar,
    CAlert,
    CRow,
    CCol,
    CSpinner,
    CFormCheck,
    CBadge,
    CTooltip,
    CButtonGroup
} from '@coreui/react';
import { cilCloudUpload, cilX, cilCheckCircle, cilWarning } from '@coreui/icons';
import CIcon from '@coreui/icons-react';
import { useDropzone } from 'react-dropzone';

// Redux imports
import {
    uploadVideo,
    startProcessing,
    setCurrentFile,
    clearCurrentUpload,
    selectUploadStatus,
    selectCurrentUpload,
    selectUploadError,
    selectProcessingStatus
} from '../../store/videoSlice';

import {
    selectVideoUploadPreferences
} from '../../store/userPreferencesSlice';

// Custom hooks
import useFileUpload from '../../hooks/useFileUpload';
import useLocalStorage from '../../hooks/useLocalStorage';
import useWebSocketConnection from '../../hooks/useWebSocketConnection';
import { getPrimaryWebSocketUrl, API_ENDPOINTS } from '../../config/api.js';

const VideoUploader = () => {
    const dispatch = useDispatch();
    const fileInputRef = useRef(null);
    
    // Redux selectors
    const uploadStatus = useSelector(selectUploadStatus);
    const currentUpload = useSelector(selectCurrentUpload);
    const uploadError = useSelector(selectUploadError);
    const processingStatus = useSelector(selectProcessingStatus);
    const userPreferences = useSelector(selectVideoUploadPreferences);
    
    // Local preferences with localStorage
    const [localPrefs, setLocalPrefs] = useLocalStorage('videoUploadPrefs', {
        autoStartProcessing: true,
        showUploadProgress: true,
        maxFileSize: 500 * 1024 * 1024, // 500MB default
        enableNotifications: true,
        retryOnFailure: true,
        maxRetries: 3,
        chunkSize: 5 * 1024 * 1024, // 5MB chunks
        acceptedFormats: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv']
    });

    // File upload hook with enhanced features
    const {
        uploadFile,
        progress: uploadProgress,
        uploading: isProcessingFile,
        error: uploadHookError,
        retry: retryUpload,
        cancel: cancelUpload,
        resume: resumeUpload,
        isPaused,
        canResume
    } = useFileUpload({
        accept: localPrefs.acceptedFormats.map(format => `.${format}`).join(','),
        maxSize: localPrefs.maxFileSize,
        chunkSize: localPrefs.chunkSize,
        maxRetries: localPrefs.maxRetries,
        enableRetry: localPrefs.retryOnFailure,
        onUploadComplete: handleUploadComplete,
        onProgress: (progress) => {
            // Progress is automatically tracked by the hook
        },
        onError: (error) => {
            console.error('Upload error:', error);
            // Error is handled by the hook and Redux
        },
        onRetry: (attempt) => {
            console.log(`Upload retry attempt ${attempt}/${localPrefs.maxRetries}`);
        }
    });

    // WebSocket connection for real-time processing updates
    const { 
        connected: wsConnected,
        lastMessage,
        connectionError: wsError
    } = useWebSocketConnection({
        url: getPrimaryWebSocketUrl(API_ENDPOINTS.PRIMARY.ENDPOINTS.WEBSOCKET_VIDEO_PROCESSING),
        autoConnect: true,
        reconnectAttempts: 5,
        reconnectInterval: 3000
    });

    // Handle successful upload
    async function handleUploadComplete(file, response) {
        try {
            const { video_id } = response.data;
            
            // Update Redux with video info
            dispatch(setCurrentFile({
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
                videoId: video_id
            }));

            // Auto-start processing if preference is enabled
            if (localPrefs.autoStartProcessing) {
                await dispatch(startProcessing(video_id));
            }

            // Show notification if enabled
            if (localPrefs.enableNotifications && 'Notification' in window) {
                new Notification('Video Upload Complete', {
                    body: `${file.name} has been uploaded successfully`,
                    icon: '/favicon.ico'
                });
            }

        } catch (error) {
            console.error('Error handling upload completion:', error);
        }
    }

    // File validation
    const validateFile = useCallback((file) => {
        const errors = [];
        
        // Check file size
        if (file.size > localPrefs.maxFileSize) {
            errors.push(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(localPrefs.maxFileSize / 1024 / 1024).toFixed(2)}MB)`);
        }
        
        // Check file format
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!localPrefs.acceptedFormats.includes(fileExtension)) {
            errors.push(`File format .${fileExtension} is not supported. Accepted formats: ${localPrefs.acceptedFormats.join(', ')}`);
        }
        
        // Check file name length
        if (file.name.length > 255) {
            errors.push('File name is too long (max 255 characters)');
        }
        
        return errors;
    }, [localPrefs.maxFileSize, localPrefs.acceptedFormats]);

    // Handle file selection
    const handleFileSelect = useCallback((files) => {
        const file = Array.isArray(files) ? files[0] : files;
        if (!file) return;

        // Validate file
        const validationErrors = validateFile(file);
        if (validationErrors.length > 0) {
            // You could dispatch an error action here
            console.error('File validation errors:', validationErrors);
            return;
        }

        // Use the file upload hook
        uploadFile(file);
    }, [uploadFile, validateFile]);

    // Handle file input change
    const handleFileInputChange = useCallback((event) => {
        const file = event.target.files[0];
        if (file) {
            handleFileSelect(file);
        }
    }, [handleFileSelect]);

    // Dropzone configuration
    const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
        if (rejectedFiles.length > 0) {
            const error = rejectedFiles[0].errors[0];
            console.error('File rejected:', error.message);
            return;
        }

        if (acceptedFiles.length > 0) {
            handleFileSelect(acceptedFiles[0]);
        }
    }, [handleFileSelect]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'video/*': localPrefs.acceptedFormats.map(format => `.${format}`)
        },
        multiple: false,
        maxSize: localPrefs.maxFileSize,
        disabled: isProcessingFile || uploadStatus === 'loading'
    });

    // Clear file and reset state
    const handleClearFile = useCallback(() => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        
        // Cancel ongoing upload if any
        if (isProcessingFile) {
            cancelUpload();
        }
        
        dispatch(clearCurrentUpload());
    }, [dispatch, isProcessingFile, cancelUpload]);

    // Manual upload trigger (for when auto-upload is disabled)
    const handleManualUpload = useCallback(async () => {
        if (!currentUpload.file) return;
        
        try {
            // This would trigger the actual upload process
            // The file is already selected via the hook
            const resultAction = await dispatch(uploadVideo(currentUpload.file));

            if (uploadVideo.fulfilled.match(resultAction)) {
                // Processing will be started automatically if autoStartProcessing is enabled
                if (!localPrefs.autoStartProcessing) {
                    // Manual processing trigger
                    await dispatch(startProcessing(resultAction.payload.video_id));
                }
            }
        } catch (error) {
            console.error('Manual upload error:', error);
        }
    }, [dispatch, currentUpload.file, localPrefs.autoStartProcessing]);

    // Processing WebSocket updates
    useEffect(() => {
        if (lastMessage && currentUpload.videoId) {
            const data = JSON.parse(lastMessage.data);
            if (data.video_id === currentUpload.videoId) {
                // Handle processing status updates
                console.log('Processing update:', data);
            }
        }
    }, [lastMessage, currentUpload.videoId]);

    // Request notification permission on mount
    useEffect(() => {
        if (localPrefs.enableNotifications && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, [localPrefs.enableNotifications]);

    // Computed states
    const isUploading = uploadStatus === 'loading' || isProcessingFile;
    const isReadyToProcess = uploadStatus === 'succeeded' || uploadStatus === 'uploaded';
    const hasFile = currentUpload.file || isProcessingFile;
    const canRetry = uploadHookError && !isProcessingFile && canResume;
    const showProgress = localPrefs.showUploadProgress && (isUploading || uploadProgress > 0);

    return (
        <CCard>
            <CCardHeader>
                <div className="d-flex justify-content-between align-items-center">
                    <div>
                        <h5 className="mb-1">Upload Video for Face Detection</h5>
                        <small className="text-muted">
                            Supports: {localPrefs.acceptedFormats.join(', ').toUpperCase()} 
                            (max {(localPrefs.maxFileSize / 1024 / 1024).toFixed(0)}MB)
                        </small>
                    </div>
                    <div className="d-flex align-items-center">
                        {wsConnected && (
                            <CBadge color="success" className="me-2">
                                <CIcon icon={cilCheckCircle} size="sm" className="me-1" />
                                Live Updates
                            </CBadge>
                        )}
                        {wsError && (
                            <CBadge color="warning" className="me-2">
                                <CIcon icon={cilWarning} size="sm" className="me-1" />
                                Offline Mode
                            </CBadge>
                        )}
                    </div>
                </div>
            </CCardHeader>

            <CCardBody>
                {/* Error Display */}
                {(uploadError || uploadHookError) && (
                    <CAlert color="danger" className="mb-3">
                        <div className="d-flex justify-content-between align-items-start">
                            <div>
                                <strong>Upload Error:</strong>
                                <div>{uploadError || uploadHookError}</div>
                            </div>
                            {canRetry && (
                                <CButton 
                                    color="outline-danger" 
                                    size="sm"
                                    onClick={retryUpload}
                                >
                                    Retry
                                </CButton>
                            )}
                        </div>
                    </CAlert>
                )}

                {/* Upload Progress */}
                {showProgress && (
                    <CAlert color="info" className="mb-3">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                            <div className="d-flex align-items-center">
                                <CSpinner size="sm" className="me-2" />
                                <span>
                                    {isProcessingFile ? 'Processing file...' : 'Uploading...'}
                                </span>
                            </div>
                            <div className="d-flex">
                                {isPaused && (
                                    <CButton 
                                        color="outline-primary" 
                                        size="sm" 
                                        className="me-2"
                                        onClick={resumeUpload}
                                    >
                                        Resume
                                    </CButton>
                                )}
                                <CButton 
                                    color="outline-secondary" 
                                    size="sm"
                                    onClick={cancelUpload}
                                >
                                    Cancel
                                </CButton>
                            </div>
                        </div>
                        <CProgress height={8}>
                            <CProgressBar value={uploadProgress} />
                        </CProgress>
                        <small className="text-muted">
                            {uploadProgress.toFixed(1)}% complete
                        </small>
                    </CAlert>
                )}

                {/* File Upload Area */}
                {!hasFile && (
                    <div
                        {...getRootProps()}
                        className={`dropzone ${isDragActive ? 'active' : ''}`}
                        style={{
                            border: '2px dashed #ccc',
                            borderRadius: '8px',
                            padding: '40px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            backgroundColor: isDragActive ? '#e3f2fd' : '#fafafa',
                            transition: 'background-color 0.2s ease'
                        }}
                    >
                        <input {...getInputProps()} />
                        <div>
                            <CIcon icon={cilCloudUpload} size="3xl" className="text-muted mb-3" />
                            <h6>
                                {isDragActive 
                                    ? 'Drop your video here...' 
                                    : 'Drop a video here or click to browse'
                                }
                            </h6>
                            <p className="text-muted mb-0">
                                Supports: {localPrefs.acceptedFormats.join(', ').toUpperCase()}
                                <br />
                                Maximum size: {(localPrefs.maxFileSize / 1024 / 1024).toFixed(0)}MB
                            </p>
                        </div>
                    </div>
                )}

                {/* Alternative File Input */}
                {!hasFile && (
                    <div className="text-center mt-3">
                        <div className="input-group d-inline-flex w-auto">
                            <input
                                type="file"
                                className="form-control"
                                accept={localPrefs.acceptedFormats.map(format => `.${format}`).join(',')}
                                onChange={handleFileInputChange}
                                ref={fileInputRef}
                                disabled={isUploading}
                                style={{ maxWidth: '300px' }}
                            />
                        </div>
                    </div>
                )}

                {/* File Info Display */}
                {currentUpload.file && !isProcessingFile && (
                    <CRow className="mb-3">
                        <CCol>
                            <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                                <div>
                                    <strong>{currentUpload.file.name}</strong>
                                    <div className="text-muted">
                                        {(currentUpload.file.size / (1024 * 1024)).toFixed(2)} MB
                                        {currentUpload.videoId && (
                                            <CBadge color="success" className="ms-2">
                                                ID: {currentUpload.videoId}
                                            </CBadge>
                                        )}
                                    </div>
                                </div>
                                <CButton
                                    color="outline-danger"
                                    size="sm"
                                    onClick={handleClearFile}
                                    disabled={isUploading}
                                >
                                    <CIcon icon={cilX} />
                                </CButton>
                            </div>
                        </CCol>
                    </CRow>
                )}

                {/* Upload Preferences */}
                <CCard className="mb-3">
                    <CCardBody>
                        <h6>Upload Settings</h6>
                        <CFormCheck
                            checked={localPrefs.autoStartProcessing}
                            onChange={(e) => setLocalPrefs({
                                ...localPrefs,
                                autoStartProcessing: e.target.checked
                            })}
                            label="Auto-start processing after upload"
                        />
                        <CFormCheck
                            checked={localPrefs.showUploadProgress}
                            onChange={(e) => setLocalPrefs({
                                ...localPrefs,
                                showUploadProgress: e.target.checked
                            })}
                            label="Show detailed upload progress"
                        />
                        <CFormCheck
                            checked={localPrefs.enableNotifications}
                            onChange={(e) => setLocalPrefs({
                                ...localPrefs,
                                enableNotifications: e.target.checked
                            })}
                            label="Enable browser notifications"
                        />
                        <CFormCheck
                            checked={localPrefs.retryOnFailure}
                            onChange={(e) => setLocalPrefs({
                                ...localPrefs,
                                retryOnFailure: e.target.checked
                            })}
                            label="Automatically retry failed uploads"
                        />
                    </CCardBody>
                </CCard>
            </CCardBody>

            {/* Action Footer */}
            {currentUpload.file && !isUploading && (
                <CCardFooter className="d-flex justify-content-between align-items-center">
                    <div className="text-muted">
                        Ready to {localPrefs.autoStartProcessing ? 'upload and process' : 'upload'}
                    </div>
                    <CButtonGroup>
                        <CButton
                            color="outline-secondary"
                            onClick={handleClearFile}
                        >
                            Clear
                        </CButton>
                        {!localPrefs.autoStartProcessing && (
                            <CButton
                                color="primary"
                                onClick={handleManualUpload}
                                disabled={!currentUpload.file || isReadyToProcess}
                            >
                                <CIcon icon={cilCloudUpload} className="me-2" />
                                Upload & Process
                            </CButton>
                        )}
                    </CButtonGroup>
                </CCardFooter>
            )}
        </CCard>
    );
};

export default VideoUploader;
