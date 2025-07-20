import React, { useCallback, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    CCard,
    CCardBody,
    CCardHeader,
    CCardFooter,
    CCol,
    CRow,
    CButton,
    CSpinner,
    CAlert,
    CProgress,
    CProgressBar,
    CFormInput,
    CFormCheck,
    CBadge,
    CTooltip,
    CButtonGroup,
    CDropdown,
    CDropdownToggle,
    CDropdownMenu,
    CDropdownItem
} from '@coreui/react';
import { cilCloudUpload, cilX, cilCheckCircle, cilWarning, cilSettings } from '@coreui/icons';
import CIcon from '@coreui/icons-react';
import { useDropzone } from 'react-dropzone';

// Redux imports
import {
    uploadImage,
    detectFaces,
    clearImageResults,
    setCurrentImage,
    clearCurrentImage,
    setUploadError,
    selectImageUploadStatus,
    selectCurrentImage,
    selectImageUploadError,
    selectDetectionResults,
    selectImageUploadPreferences
} from '../../store/imageProcessingSlice';

// Custom hooks
import useFileUpload from '../../hooks/useFileUpload';
import useImageLoader from '../../hooks/useImageLoader';
import useLocalStorage from '../../hooks/useLocalStorage';

const ImageUploader = ({
    // Configuration props for reusability
    mode = 'face-detection', // 'face-detection', 'generic', 'manual-embedding'
    onUploadComplete = null,
    onDetectionComplete = null,
    allowedFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
    maxFileSize = 10 * 1024 * 1024, // 10MB default
    enablePreview = true,
    enableAutoDetection = true,
    redirectOnSuccess = true,
    className = '',
    title = 'Upload Image for Face Detection'
}) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    
    // Redux selectors
    const uploadStatus = useSelector(selectImageUploadStatus);
    const currentImage = useSelector(selectCurrentImage);
    const uploadError = useSelector(selectImageUploadError);
    const detectionResults = useSelector(selectDetectionResults);
    const userPreferences = useSelector(selectImageUploadPreferences);
    
    // Local preferences with localStorage
    const [localPrefs, setLocalPrefs] = useLocalStorage('imageUploadPrefs', {
        enablePreview: enablePreview,
        autoDetectFaces: enableAutoDetection && mode === 'face-detection',
        showUploadProgress: true,
        maxFileSize: maxFileSize,
        enableNotifications: true,
        retryOnFailure: true,
        maxRetries: 3,
        imageQuality: 0.95,
        enableImageOptimization: true,
        acceptedFormats: allowedFormats,
        enableDragDrop: true,
        autoNavigateOnSuccess: redirectOnSuccess,
        enableImageValidation: true
    });

    // Image processing hook with enhanced features
    const {
        uploadFile,
        progress: uploadProgress,
        uploading: isProcessingImage,
        error: uploadHookError,
        retry: retryUpload,
        cancel: cancelUpload,
        resume: resumeUpload,
        isPaused,
        canResume
    } = useFileUpload({
        accept: localPrefs.acceptedFormats.map(format => `.${format}`).join(','),
        maxSize: localPrefs.maxFileSize,
        maxRetries: localPrefs.maxRetries,
        enableRetry: localPrefs.retryOnFailure,
        onUploadComplete: handleImageProcessed,
        onProgress: (progress) => {
            // Progress is automatically tracked by the hook
        },
        onError: (error) => {
            console.error('Image upload error:', error);
            dispatch(setUploadError(`Failed to process image: ${error.message}`));
        },
        onRetry: (attempt) => {
            // Retry attempt handled silently
        }
    });

    // Image loading hook for preview optimization
    const { 
        loadImage, 
        imageUrls, 
        loadingStates,
        errors: imageErrors 
    } = useImageLoader();

    // Image optimization function
    const optimizeImage = useCallback(async (file) => {
        if (!localPrefs.enableImageOptimization) return file;

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate optimal dimensions
                let { width, height } = img;
                const maxDimension = 1920; // Max width/height for optimization
                
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = (height * maxDimension) / width;
                        width = maxDimension;
                    } else {
                        width = (width * maxDimension) / height;
                        height = maxDimension;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        const optimizedFile = new File([blob], file.name, {
                            type: file.type,
                            lastModified: Date.now(),
                        });
                        
                        resolve(optimizedFile);
                    } else {
                        reject(new Error('Failed to optimize image'));
                    }
                }, file.type, localPrefs.imageQuality);
            };
            
            img.onerror = () => reject(new Error('Failed to load image for optimization'));
            img.src = URL.createObjectURL(file);
        });
    }, [localPrefs.enableImageOptimization, localPrefs.imageQuality]);

    // Handle successful image processing
    async function handleImageProcessed(file, response) {
        try {
            const optimizedFile = await optimizeImage(file);
            const preview = URL.createObjectURL(optimizedFile);
            
            // Get image dimensions
            const img = new Image();
            img.onload = async () => {
                const imageData = {
                    file: optimizedFile,
                    preview,
                    dimensions: { width: img.width, height: img.height },
                    originalFile: file,
                    optimized: optimizedFile !== file
                };
                
                dispatch(setCurrentImage(imageData));
                
                // Auto-detect faces if enabled
                if (localPrefs.autoDetectFaces && mode === 'face-detection') {
                    await handleDetectFaces(optimizedFile);
                }
                
                // Call custom upload complete handler
                if (onUploadComplete) {
                    onUploadComplete(imageData);
                }
                
                // Show notification if enabled
                if (localPrefs.enableNotifications && 'Notification' in window) {
                    new Notification('Image Upload Complete', {
                        body: `${file.name} has been uploaded successfully`,
                        icon: '/favicon.ico'
                    });
                }
            };
            img.src = preview;
            
        } catch (error) {
            console.error('Error processing uploaded image:', error);
            dispatch(setUploadError(`Failed to process image: ${error.message}`));
        }
    }

    // File validation
    const validateFile = useCallback((file) => {
        if (!localPrefs.enableImageValidation) return [];
        
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
        
        // Check if it's actually an image
        if (!file.type.startsWith('image/')) {
            errors.push('Selected file is not a valid image');
        }
        
        // Check file name length
        if (file.name.length > 255) {
            errors.push('File name is too long (max 255 characters)');
        }
        
        return errors;
    }, [localPrefs]);

    // Handle file selection
    const handleFileSelect = useCallback((files) => {
        const file = Array.isArray(files) ? files[0] : files;
        if (!file) return;

        // Validate file
        const validationErrors = validateFile(file);
        if (validationErrors.length > 0) {
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
            'image/*': localPrefs.acceptedFormats.map(format => `.${format}`)
        },
        multiple: false,
        maxSize: localPrefs.maxFileSize,
        disabled: isProcessingImage || uploadStatus === 'loading'
    });

    // Face detection handler
    const handleDetectFaces = useCallback(async (imageFile = null) => {
        const file = imageFile || currentImage?.file;
        if (!file) return;

        try {
            const resultAction = await dispatch(detectFaces(file));
            
            if (detectFaces.fulfilled.match(resultAction)) {
                const results = resultAction.payload;
                
                // Call custom detection complete handler
                if (onDetectionComplete) {
                    onDetectionComplete(results);
                }
                
                // Auto-navigate if enabled
                if (localPrefs.autoNavigateOnSuccess && mode === 'face-detection') {
                    navigate('/components/face/detections', {
                        state: { detectionResults: results }
                    });
                }
            }
        } catch (error) {
            console.error('Face detection error:', error);
        }
    }, [dispatch, currentImage?.file, onDetectionComplete, localPrefs.autoNavigateOnSuccess, mode, navigate]);

    // Clear image and reset state
    const handleClearImage = useCallback(() => {
        if (currentImage?.preview) {
            URL.revokeObjectURL(currentImage.preview);
        }
        
        // Cancel ongoing upload if any
        if (isProcessingImage) {
            cancelUpload();
        }
        
        dispatch(clearCurrentImage());
        dispatch(clearImageResults());
        
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [dispatch, currentImage?.preview, isProcessingImage, cancelUpload]);

    // Request notification permission on mount
    useEffect(() => {
        if (localPrefs.enableNotifications && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, [localPrefs.enableNotifications]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (currentImage?.preview) {
                URL.revokeObjectURL(currentImage.preview);
            }
        };
    }, [currentImage?.preview]);

    // Computed states
    const isUploading = uploadStatus === 'loading' || isProcessingImage;
    const hasImage = currentImage || isProcessingImage;
    const canDetect = currentImage && mode === 'face-detection';
    const canRetry = uploadHookError && !isProcessingImage && canResume;
    const showProgress = localPrefs.showUploadProgress && (isUploading || uploadProgress > 0);

    return (
        <CRow className={className}>
            <CCol xs={12}>
                <CCard className="mb-4">
                    <CCardHeader>
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <strong>{title}</strong>
                                <div className="text-muted small">
                                    Supports: {localPrefs.acceptedFormats.join(', ').toUpperCase()} 
                                    (max {(localPrefs.maxFileSize / 1024 / 1024).toFixed(0)}MB)
                                </div>
                            </div>
                            <div className="d-flex align-items-center">
                                {currentImage?.optimized && (
                                    <CBadge color="success" className="me-2">
                                        <CIcon icon={cilCheckCircle} size="sm" className="me-1" />
                                        Optimized
                                    </CBadge>
                                )}
                                {localPrefs.enableImageOptimization && (
                                    <CBadge color="info" className="me-2">
                                        Auto-Optimize
                                    </CBadge>
                                )}
                            </div>
                        </div>
                    </CCardHeader>

                    <CCardBody>
                        {/* Upload Progress */}
                        {showProgress && (
                            <CAlert color="info" className="mb-3">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                    <div className="d-flex align-items-center">
                                        <CSpinner size="sm" className="me-2" />
                                        <span>
                                            {isProcessingImage ? 'Processing image...' : 'Uploading...'}
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

                        <CRow>
                            <CCol md={6}>
                                {/* File Upload Area */}
                                {!hasImage && localPrefs.enableDragDrop && (
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
                                                    ? 'Drop your image here...' 
                                                    : 'Drop an image here or click to browse'
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
                                {!hasImage && (
                                    <div className={localPrefs.enableDragDrop ? "text-center mt-3" : ""}>
                                        <CFormInput
                                            ref={fileInputRef}
                                            type="file"
                                            label={!localPrefs.enableDragDrop ? "Select an image to upload" : "Or choose file"}
                                            onChange={handleFileInputChange}
                                            accept={localPrefs.acceptedFormats.map(format => `.${format}`).join(',')}
                                            disabled={isUploading}
                                        />
                                    </div>
                                )}

                                {/* Image Preview */}
                                {currentImage && localPrefs.enablePreview && (
                                    <div className="position-relative">
                                        <div style={{ maxWidth: '100%', maxHeight: '400px', overflow: 'hidden', borderRadius: '8px' }}>
                                            <img 
                                                src={currentImage.preview} 
                                                alt="Upload Preview" 
                                                style={{ width: '100%', objectFit: 'contain' }} 
                                            />
                                        </div>
                                        <CButton
                                            color="outline-danger"
                                            size="sm"
                                            className="position-absolute top-0 end-0 m-2"
                                            onClick={handleClearImage}
                                            disabled={isUploading}
                                        >
                                            <CIcon icon={cilX} />
                                        </CButton>
                                    </div>
                                )}
                            </CCol>

                            <CCol md={6}>
                                {/* Image Information */}
                                {currentImage && (
                                    <CCard className="mb-3">
                                        <CCardBody>
                                            <h6>Image Information</h6>
                                            <div className="mb-2">
                                                <strong>File:</strong> {currentImage.originalFile?.name || 'Unknown'}
                                            </div>
                                            <div className="mb-2">
                                                <strong>Size:</strong> {(currentImage.originalFile?.size / 1024 / 1024).toFixed(2)} MB
                                            </div>
                                            <div className="mb-2">
                                                <strong>Dimensions:</strong> {currentImage.dimensions?.width} × {currentImage.dimensions?.height}
                                            </div>
                                            {currentImage.optimized && (
                                                <CBadge color="success">
                                                    Image optimized for better performance
                                                </CBadge>
                                            )}
                                        </CCardBody>
                                    </CCard>
                                )}

                                {/* Upload Preferences */}
                                <CCard className="mb-3">
                                    <CCardBody>
                                        <h6>Upload Settings</h6>
                                        {mode === 'face-detection' && (
                                            <CFormCheck
                                                checked={localPrefs.autoDetectFaces}
                                                onChange={(e) => setLocalPrefs({
                                                    ...localPrefs,
                                                    autoDetectFaces: e.target.checked
                                                })}
                                                label="Auto-detect faces after upload"
                                            />
                                        )}
                                        <CFormCheck
                                            checked={localPrefs.enableImageOptimization}
                                            onChange={(e) => setLocalPrefs({
                                                ...localPrefs,
                                                enableImageOptimization: e.target.checked
                                            })}
                                            label="Optimize images for performance"
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
                                        {mode === 'face-detection' && (
                                            <CFormCheck
                                                checked={localPrefs.autoNavigateOnSuccess}
                                                onChange={(e) => setLocalPrefs({
                                                    ...localPrefs,
                                                    autoNavigateOnSuccess: e.target.checked
                                                })}
                                                label="Auto-navigate to results"
                                            />
                                        )}
                                    </CCardBody>
                                </CCard>
                            </CCol>
                        </CRow>
                    </CCardBody>

                    {/* Action Footer */}
                    {currentImage && (
                        <CCardFooter className="d-flex justify-content-between align-items-center">
                            <div className="text-muted">
                                Ready for {mode === 'face-detection' ? 'face detection' : 'processing'}
                            </div>
                            <CButtonGroup>
                                <CButton
                                    color="outline-secondary"
                                    onClick={handleClearImage}
                                    disabled={isUploading}
                                >
                                    Clear
                                </CButton>
                                {canDetect && !localPrefs.autoDetectFaces && (
                                    <CButton
                                        color="primary"
                                        onClick={handleDetectFaces}
                                        disabled={isUploading}
                                    >
                                        <CIcon icon={cilCloudUpload} className="me-2" />
                                        Detect Faces
                                    </CButton>
                                )}
                            </CButtonGroup>
                        </CCardFooter>
                    )}
                </CCard>
            </CCol>
        </CRow>
    );
};

export default ImageUploader;
