import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook for handling file uploads with progress tracking and validation
 * @param {Object} options - Configuration options
 * @returns {Object} - File upload state and methods
 */
const useFileUpload = (options = {}) => {
    const {
        multiple = false,
        accept = '*/*',
        maxSize = 50 * 1024 * 1024, // 50MB default
        maxFiles = 5,
        onUploadProgress = () => {},
        onUploadComplete = () => {},
        onUploadError = () => {},
        validateFile = () => true,
        autoUpload = false
    } = options;

    const fileInputRef = useRef(null);
    
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState({});
    const [uploadStatus, setUploadStatus] = useState('idle'); // 'idle', 'uploading', 'completed', 'error'
    const [error, setError] = useState(null);
    const [previews, setPreviews] = useState({});

    // Validate a single file
    const validateSingleFile = useCallback((file) => {
        // Size validation
        if (file.size > maxSize) {
            return {
                valid: false,
                error: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed size (${(maxSize / 1024 / 1024).toFixed(1)}MB)`
            };
        }

        // Custom validation
        const customValidation = validateFile(file);
        if (customValidation !== true) {
            return {
                valid: false,
                error: typeof customValidation === 'string' ? customValidation : 'File validation failed'
            };
        }

        return { valid: true };
    }, [maxSize, validateFile]);

    // Create preview for file (if it's an image)
    const createPreview = useCallback((file) => {
        return new Promise((resolve) => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(file);
            } else {
                resolve(null);
            }
        });
    }, []);

    // Handle file selection
    const handleFileSelect = useCallback(async (files) => {
        const fileList = Array.from(files);
        
        // Check file count limit
        if (!multiple && fileList.length > 1) {
            setError('Only one file is allowed');
            return;
        }
        
        if (multiple && fileList.length > maxFiles) {
            setError(`Maximum ${maxFiles} files allowed`);
            return;
        }

        // Validate files
        const validatedFiles = [];
        const errors = [];

        for (const file of fileList) {
            const validation = validateSingleFile(file);
            if (validation.valid) {
                const preview = await createPreview(file);
                const fileData = {
                    file,
                    id: `${file.name}_${file.lastModified}_${Math.random()}`,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    preview,
                    status: 'pending'
                };
                validatedFiles.push(fileData);
                
                if (preview) {
                    setPreviews(prev => ({ ...prev, [fileData.id]: preview }));
                }
            } else {
                errors.push(`${file.name}: ${validation.error}`);
            }
        }

        if (errors.length > 0) {
            setError(errors.join('; '));
        } else {
            setError(null);
        }

        // Update selected files
        if (multiple) {
            setSelectedFiles(prev => [...prev, ...validatedFiles]);
        } else {
            setSelectedFiles(validatedFiles);
        }

        // Auto upload if enabled
        if (autoUpload && validatedFiles.length > 0) {
            uploadFiles(validatedFiles);
        }

    }, [multiple, maxFiles, validateSingleFile, createPreview, autoUpload]);

    // Upload files
    const uploadFiles = useCallback(async (filesToUpload = selectedFiles) => {
        if (filesToUpload.length === 0) return;

        setUploadStatus('uploading');
        setError(null);

        try {
            const uploadPromises = filesToUpload.map(async (fileData) => {
                try {
                    // Initialize progress
                    setUploadProgress(prev => ({ ...prev, [fileData.id]: 0 }));
                    
                    // Update file status
                    setSelectedFiles(prev => 
                        prev.map(f => f.id === fileData.id ? { ...f, status: 'uploading' } : f)
                    );

                    // Simulate progress updates (replace with actual upload logic)
                    const progressInterval = setInterval(() => {
                        setUploadProgress(prev => {
                            const currentProgress = prev[fileData.id] || 0;
                            const newProgress = Math.min(currentProgress + 10, 90);
                            onUploadProgress(fileData.id, newProgress);
                            return { ...prev, [fileData.id]: newProgress };
                        });
                    }, 100);

                    // Replace this with your actual upload logic
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    clearInterval(progressInterval);
                    
                    // Complete upload
                    setUploadProgress(prev => ({ ...prev, [fileData.id]: 100 }));
                    setSelectedFiles(prev => 
                        prev.map(f => f.id === fileData.id ? { ...f, status: 'completed' } : f)
                    );
                    
                    onUploadComplete(fileData);
                    
                } catch (error) {
                    setSelectedFiles(prev => 
                        prev.map(f => f.id === fileData.id ? { ...f, status: 'error', error: error.message } : f)
                    );
                    onUploadError(fileData.id, error);
                    throw error;
                }
            });

            await Promise.allSettled(uploadPromises);
            setUploadStatus('completed');
            
        } catch (error) {
            setUploadStatus('error');
            setError(error.message);
        }
    }, [selectedFiles, onUploadProgress, onUploadComplete, onUploadError]);

    // Remove file
    const removeFile = useCallback((fileId) => {
        setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
        setUploadProgress(prev => {
            const { [fileId]: removed, ...rest } = prev;
            return rest;
        });
        setPreviews(prev => {
            const { [fileId]: removed, ...rest } = prev;
            return rest;
        });
    }, []);

    // Clear all files
    const clearFiles = useCallback(() => {
        setSelectedFiles([]);
        setUploadProgress({});
        setPreviews({});
        setError(null);
        setUploadStatus('idle');
        
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, []);

    // Open file dialog
    const openFileDialog = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    // Get overall progress
    const getOverallProgress = useCallback(() => {
        if (selectedFiles.length === 0) return 0;
        
        const totalProgress = Object.values(uploadProgress).reduce((sum, progress) => sum + progress, 0);
        return Math.round(totalProgress / selectedFiles.length);
    }, [selectedFiles.length, uploadProgress]);

    // Input props for file input element
    const inputProps = {
        ref: fileInputRef,
        type: 'file',
        multiple,
        accept,
        onChange: (e) => handleFileSelect(e.target.files),
        style: { display: 'none' }
    };

    return {
        // State
        selectedFiles,
        uploadProgress,
        uploadStatus,
        error,
        previews,
        
        // Methods
        handleFileSelect,
        uploadFiles,
        removeFile,
        clearFiles,
        openFileDialog,
        
        // Utilities
        getOverallProgress,
        isUploading: uploadStatus === 'uploading',
        isCompleted: uploadStatus === 'completed',
        hasError: uploadStatus === 'error',
        
        // Props
        inputProps,
        fileInputRef
    };
};

export default useFileUpload;
