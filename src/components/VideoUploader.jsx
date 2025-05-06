import React, { useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    uploadVideo,
    startProcessing,
    setCurrentFile,
    clearCurrentUpload
} from '../store/videoSlice';
import {
    CButton,
    CCard,
    CCardBody,
    CCardHeader,
    CCardFooter,
    CProgress,
    CAlert,
    CRow,
    CCol,
    CSpinner
} from '@coreui/react';
import { cilCloudUpload, cilX } from '@coreui/icons';
import CIcon from '@coreui/icons-react';

const VideoUploader = () => {
    const dispatch = useDispatch();
    const { uploadStatus, currentUpload, error } = useSelector((state) => state.video);
    const fileInputRef = useRef(null);
    
    // Keep the actual File object in component state instead of Redux
    const [selectedFile, setSelectedFile] = useState(null);
    
    // Local state for upload progress (would be used with axios progress tracking)
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Store file in component state
            setSelectedFile(file);
            
            // Send only serializable properties to Redux
            dispatch(setCurrentFile({
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified
            }));
        }
    };

    const handleClearFile = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setSelectedFile(null);
        dispatch(clearCurrentUpload());
    };

    const handleUpload = useCallback(async () => {
        if (!selectedFile) return;

        // Direct upload through the backend API - pass actual File from component state
        const resultAction = await dispatch(uploadVideo(selectedFile));

        if (uploadVideo.fulfilled.match(resultAction)) {
            // Start processing the uploaded video
            dispatch(startProcessing(resultAction.payload.video_id));
        }
    }, [dispatch, selectedFile]);

    const isUploading = uploadStatus === 'loading' || uploadStatus === 'uploading';
    const isReadyToProcess = uploadStatus === 'uploaded';

    return (
        <CCard>
            <CCardHeader>Upload Video for Face Detection</CCardHeader>
            <CCardBody>
                {error && <CAlert color="danger">{error}</CAlert>}

                <CRow className="mb-3">
                    <CCol>
                        <div className="input-group">
                            <input
                                type="file"
                                className="form-control"
                                accept="video/*"
                                onChange={handleFileSelect}
                                ref={fileInputRef}
                                disabled={isUploading}
                            />
                            {currentUpload.file && (
                                <CButton
                                    color="secondary"
                                    onClick={handleClearFile}
                                    disabled={isUploading}
                                >
                                    <CIcon icon={cilX} />
                                </CButton>
                            )}
                        </div>
                    </CCol>
                </CRow>

                {currentUpload.file && (
                    <CRow className="mb-3">
                        <CCol>
                            <strong>Selected file:</strong> {currentUpload.file.name} ({(currentUpload.file.size / (1024 * 1024)).toFixed(2)} MB)
                        </CCol>
                    </CRow>
                )}

                {isUploading && (
                    <CProgress value={uploadProgress} className="mb-3">
                        {uploadProgress}%
                    </CProgress>
                )}

            </CCardBody>
            <CCardFooter className="d-flex justify-content-end">
                <CButton
                    color="primary"
                    onClick={handleUpload}
                    disabled={!selectedFile || isUploading || isReadyToProcess}
                >
                    {isUploading ? (
                        <>
                            <CSpinner size="sm" className="me-2" />
                            Uploading...
                        </>
                    ) : (
                        <>
                            <CIcon icon={cilCloudUpload} className="me-2" />
                            Upload Video
                        </>
                    )}
                </CButton>
            </CCardFooter>
        </CCard>
    );
};

export default VideoUploader;