import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    CCard,
    CCardBody,
    CCardHeader,
    CDropdown,
    CDropdownToggle,
    CDropdownMenu,
    CDropdownItem,
    CInputGroup,
    CFormInput,
    CButton,
    CButtonGroup,
    CBadge,
    CSpinner
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilSearch, cilGrid, cilList, cilFilter } from '@coreui/icons';
import {
    selectVideos,
    selectUploadStatus,
    selectProcessingStatus
} from '../../store/videoSlice';
import {
    selectVideoSelectorPreferences,
    updateVideoSelectorPreferences
} from '../../store/userPreferencesSlice';

/**
 * Enhanced component for selecting videos with search, filtering, and multiple view modes
 */
const VideoSelector = ({ 
    videos, // Legacy prop for backward compatibility
    selectedVideoId, 
    onSelectVideo,
    mode = 'dropdown', // 'dropdown', 'grid', 'list'
    enableSearch = true,
    enableFilter = true,
    className = '',
    title = 'Select Video'
}) => {
    const dispatch = useDispatch();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBy, setFilterBy] = useState('all');
    
    // Redux state
    const reduxVideos = useSelector(selectVideos);
    const uploadStatus = useSelector(selectUploadStatus);
    const processingStatus = useSelector(selectProcessingStatus);
    const userPreferences = useSelector(selectVideoSelectorPreferences) || {};
    
    // Use passed videos prop if available (backward compatibility), otherwise use Redux
    const sourceVideos = videos || reduxVideos;
    
    // Convert videos object to array if needed
    const videosArray = useMemo(() => {
        if (Array.isArray(sourceVideos)) {
            return sourceVideos;
        }
        if (typeof sourceVideos === 'object' && sourceVideos) {
            return Object.values(sourceVideos);
        }
        return [];
    }, [sourceVideos]);

    // Filter and search videos
    const filteredVideos = useMemo(() => {
        let filtered = videosArray;

        // Apply search filter
        if (searchTerm && enableSearch) {
            filtered = filtered.filter(video =>
                (video.fileName || video.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (video.id || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply status filter
        if (filterBy !== 'all' && enableFilter) {
            filtered = filtered.filter(video => {
                switch (filterBy) {
                    case 'processed':
                        return video.status === 'completed' || video.status === 'processed';
                    case 'processing':
                        return video.status === 'processing' || video.status === 'uploading';
                    case 'error':
                        return video.status === 'error' || video.status === 'failed';
                    default:
                        return true;
                }
            });
        }

        return filtered;
    }, [videosArray, searchTerm, filterBy, enableSearch, enableFilter]);

    const selectedVideo = selectedVideoId ? 
        filteredVideos.find(video => video.id === selectedVideoId) : null;

    const handleViewModeChange = (newMode) => {
        dispatch(updateVideoSelectorPreferences({ viewMode: newMode }));
    };

    const getStatusBadge = (video) => {
        const status = video.status || 'unknown';
        const statusColors = {
            completed: 'success',
            processed: 'success',
            processing: 'warning',
            uploading: 'info',
            error: 'danger',
            failed: 'danger',
            unknown: 'secondary'
        };
        return (
            <CBadge color={statusColors[status] || 'secondary'} className="ms-2">
                {status}
            </CBadge>
        );
    };

    const renderSearchAndFilter = () => {
        if (!enableSearch && !enableFilter) return null;

        return (
            <div className="mb-3">
                {enableSearch && (
                    <CInputGroup className="mb-2">
                        <CFormInput
                            placeholder="Search videos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <CButton variant="outline" type="button">
                            <CIcon icon={cilSearch} />
                        </CButton>
                    </CInputGroup>
                )}
                
                {enableFilter && (
                    <CButtonGroup size="sm">
                        <CButton
                            variant={filterBy === 'all' ? 'solid' : 'outline'}
                            color="primary"
                            onClick={() => setFilterBy('all')}
                        >
                            All
                        </CButton>
                        <CButton
                            variant={filterBy === 'processed' ? 'solid' : 'outline'}
                            color="success"
                            onClick={() => setFilterBy('processed')}
                        >
                            Processed
                        </CButton>
                        <CButton
                            variant={filterBy === 'processing' ? 'solid' : 'outline'}
                            color="warning"
                            onClick={() => setFilterBy('processing')}
                        >
                            Processing
                        </CButton>
                        <CButton
                            variant={filterBy === 'error' ? 'solid' : 'outline'}
                            color="danger"
                            onClick={() => setFilterBy('error')}
                        >
                            Error
                        </CButton>
                    </CButtonGroup>
                )}
            </div>
        );
    };

    const renderDropdownMode = () => (
        <CDropdown className={`mb-3 ${className}`}>
            <CDropdownToggle color="primary">
                {selectedVideo ? (
                    <>
                        {selectedVideo.fileName || selectedVideo.name || selectedVideo.id}
                        {getStatusBadge(selectedVideo)}
                    </>
                ) : (
                    'Select a video'
                )}
            </CDropdownToggle>
            <CDropdownMenu>
                {filteredVideos.length === 0 ? (
                    <CDropdownItem disabled>
                        {uploadStatus === 'uploading' || processingStatus === 'processing' ? 
                            <><CSpinner size="sm" className="me-2" />Loading...</> : 
                            'No videos found'
                        }
                    </CDropdownItem>
                ) : (
                    filteredVideos.map(video => (
                        <CDropdownItem
                            key={video.id}
                            onClick={() => onSelectVideo(video.id)}
                            active={video.id === selectedVideoId}
                        >
                            {video.fileName || video.name || video.id}
                            {getStatusBadge(video)}
                        </CDropdownItem>
                    ))
                )}
            </CDropdownMenu>
        </CDropdown>
    );

    const renderListMode = () => (
        <CCard className={className}>
            <CCardHeader>
                <div className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">{title}</h6>
                    <CBadge color="info">{filteredVideos.length} videos</CBadge>
                </div>
            </CCardHeader>
            <CCardBody>
                {renderSearchAndFilter()}
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {filteredVideos.length === 0 ? (
                        <div className="text-center py-3 text-muted">
                            {uploadStatus === 'uploading' || processingStatus === 'processing' ? 
                                <><CSpinner className="me-2" />Loading videos...</> : 
                                'No videos found'
                            }
                        </div>
                    ) : (
                        filteredVideos.map(video => (
                            <div
                                key={video.id}
                                className={`p-2 mb-2 border rounded cursor-pointer ${
                                    video.id === selectedVideoId ? 'bg-primary text-white' : 'bg-light'
                                }`}
                                onClick={() => onSelectVideo(video.id)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <strong>{video.fileName || video.name || video.id}</strong>
                                        {video.duration && (
                                            <div className="small text-muted">
                                                Duration: {video.duration}s
                                            </div>
                                        )}
                                    </div>
                                    {getStatusBadge(video)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CCardBody>
        </CCard>
    );

    const renderGridMode = () => (
        <CCard className={className}>
            <CCardHeader>
                <div className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">{title}</h6>
                    <CBadge color="info">{filteredVideos.length} videos</CBadge>
                </div>
            </CCardHeader>
            <CCardBody>
                {renderSearchAndFilter()}
                <div className="row">
                    {filteredVideos.length === 0 ? (
                        <div className="col-12 text-center py-3 text-muted">
                            {uploadStatus === 'uploading' || processingStatus === 'processing' ? 
                                <><CSpinner className="me-2" />Loading videos...</> : 
                                'No videos found'
                            }
                        </div>
                    ) : (
                        filteredVideos.map(video => (
                            <div key={video.id} className="col-md-4 col-sm-6 mb-3">
                                <CCard
                                    className={`h-100 ${video.id === selectedVideoId ? 'border-primary' : ''}`}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => onSelectVideo(video.id)}
                                >
                                    <CCardBody className="p-3">
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <h6 className="card-title text-truncate me-2">
                                                {video.fileName || video.name || video.id}
                                            </h6>
                                            {getStatusBadge(video)}
                                        </div>
                                        {video.duration && (
                                            <div className="small text-muted">
                                                Duration: {video.duration}s
                                            </div>
                                        )}
                                        {video.size && (
                                            <div className="small text-muted">
                                                Size: {(video.size / 1024 / 1024).toFixed(1)} MB
                                            </div>
                                        )}
                                    </CCardBody>
                                </CCard>
                            </div>
                        ))
                    )}
                </div>
            </CCardBody>
        </CCard>
    );

    // Render based on mode
    switch (mode) {
        case 'grid':
            return renderGridMode();
        case 'list':
            return renderListMode();
        case 'dropdown':
        default:
            return (
                <div>
                    {renderSearchAndFilter()}
                    {renderDropdownMode()}
                </div>
            );
    }
};

export default VideoSelector;