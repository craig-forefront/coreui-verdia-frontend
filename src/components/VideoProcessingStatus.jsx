import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { checkVideoStatus } from '../store/videoSlice';
import {
    CCard,
    CCardBody,
    CCardHeader,
    CProgress,
    CRow,
    CCol,
    CSpinner,
    CBadge,
    CListGroup,
    CListGroupItem,
    CAlert
} from '@coreui/react';
import { cilFace, cilVideo, cilCheck, cilX, cilLoopCircular } from '@coreui/icons';
import CIcon from '@coreui/icons-react';

const VideoProcessingStatus = ({ videoId }) => {
    const dispatch = useDispatch();
    const video = useSelector((state) => state.video.videos[videoId]);
    const processingStatus = useSelector((state) => state.video.processingStatus[videoId]);
    const [isPolling, setIsPolling] = useState(false);

    // Poll for status updates if the video is still processing
    useEffect(() => {
        let interval;
        
        if (video && (video.status === 'processing' || video.status === 'pending_processing')) {
            setIsPolling(true);
            interval = setInterval(() => {
                dispatch(checkVideoStatus(videoId));
            }, 10000); // Check every 10 seconds
        } else if (isPolling) {
            // Make one final check after status changes to ensure we have latest data
            dispatch(checkVideoStatus(videoId));
            setIsPolling(false);
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [dispatch, videoId, video?.status, isPolling]);

    if (!video) {
        return <CSpinner color="primary" />;
    }

    const renderStatusBadge = (status) => {
        switch (status) {
            case 'completed':
                return <CBadge color="success">Completed <CIcon icon={cilCheck} /></CBadge>;
            case 'processing':
                return <CBadge color="info">Processing</CBadge>;
            case 'failed':
                return <CBadge color="danger">Failed</CBadge>;
            case 'pending':
                return <CBadge color="warning">Pending</CBadge>;
            case 'uploading':
                return <CBadge color="primary">Uploading</CBadge>;
            default:
                return <CBadge color="secondary">{status}</CBadge>;
        }
    };

    const isProcessing = video.status === 'processing';
    const isCompleted = video.status === 'completed';
    
    // Keep track of the previous progress value to avoid resetting when progress is not provided
    const [lastProgress, setLastProgress] = useState(0);
    
    // Update lastProgress when we get a real progress value
    useEffect(() => {
        if (processingStatus?.progress !== undefined) {
            // Ensure progress is treated as a float
            const progressValue = typeof processingStatus.progress === 'string' 
                ? parseFloat(processingStatus.progress) 
                : processingStatus.progress;
            
            if (!isNaN(progressValue)) {
                setLastProgress(progressValue);
            }
        }
    }, [processingStatus?.progress]);
    
    // Use the last known progress value if new progress is not provided
    // Ensure progress is always treated as a float
    const progress = processingStatus?.progress !== undefined 
        ? (typeof processingStatus.progress === 'string' 
            ? parseFloat(processingStatus.progress) 
            : processingStatus.progress) 
        : lastProgress;

    // For debugging
    console.log('Video status in component:', video.status);
    console.log('Processing status in component:', processingStatus);
    console.log('Current progress value:', progress, 'Last known progress:', lastProgress);

    return (
        <CCard className="mb-4">
            <CCardHeader>
                <CIcon icon={cilVideo} className="me-2" />
                Video Processing Status
            </CCardHeader>
            <CCardBody>
                <CRow className="mb-3">
                    <CCol md={3}>
                        <strong>Video ID:</strong>
                    </CCol>
                    <CCol>{videoId}</CCol>
                </CRow>

                <CRow className="mb-3">
                    <CCol md={3}>
                        <strong>File Name:</strong>
                    </CCol>
                    <CCol>{video.fileName || 'Unknown'}</CCol>
                </CRow>

                <CRow className="mb-3">
                    <CCol md={3}>
                        <strong>Status:</strong>
                    </CCol>
                    <CCol>
                        {renderStatusBadge(video.status)}
                    </CCol>
                </CRow>

                {isProcessing && (
                    <CRow className="mb-3">
                        <CCol md={3}>
                            <strong>Progress:</strong>
                        </CCol>
                        <CCol md={9}>
                            <CProgress value={progress * 100} className="mb-3">
                                {(progress * 100).toFixed(0)}%
                            </CProgress>
                        </CCol>
                    </CRow>
                )}

                {video.error && (
                    <CRow className="mb-3">
                        <CCol md={3}>
                            <strong>Error:</strong>
                        </CCol>
                        <CCol className="text-danger">
                            {video.error}
                        </CCol>
                    </CRow>
                )}

                {isCompleted && !video.faceGroups && (
                    <CAlert color="warning">
                        Processing has completed but no face groups were found.
                    </CAlert>
                )}

                {video.faceGroups && (
                    <>
                        <h5 className="mt-4 mb-3">
                            <CIcon icon={cilFace} className="me-2" />
                            Detected Face Groups
                        </h5>
                        <CListGroup>
                            {video.faceGroups.map(group => (
                                <CListGroupItem key={group.id} className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <strong>Group {group.id}</strong>
                                        <div>Confidence: {(group.confidence * 100).toFixed(1)}%</div>
                                    </div>
                                    <CBadge color="primary" shape="rounded-pill">
                                        {group.face_count} faces
                                    </CBadge>
                                </CListGroupItem>
                            ))}
                        </CListGroup>
                    </>
                )}

                {video.status === 'processing' && (
                    <div className="d-flex align-items-center mt-4">
                        <CSpinner size="sm" className="me-2" />
                        <span>Processing video... {(progress * 100).toFixed(0)}% complete</span>
                    </div>
                )}

                {video.status === 'completed' && (
                    <div className="d-flex align-items-center mt-4 text-success">
                        <CIcon icon={cilCheck} className="me-2" />
                        <span>Processing completed successfully!</span>
                    </div>
                )}
            </CCardBody>
        </CCard>
    );
};

export default VideoProcessingStatus;