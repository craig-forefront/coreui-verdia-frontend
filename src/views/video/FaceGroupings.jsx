import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
    CContainer,
    CRow,
    CCol,
    CAlert,
    CSpinner
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilGroup, cilOptions } from '@coreui/icons';

// Import extracted components
import FaceGroupCard from '../../components/faces/FaceGroupCard';
import FaceDetailModal from '../../components/faces/FaceDetailModal';
import VideoSelector from '../../components/faces/VideoSelector';
import SearchAndFilterBar from '../../components/faces/SearchAndFilterBar';

// Import custom hooks
import useFaceGroups from '../../hooks/useFaceGroups';
import usePresignedUrls from '../../hooks/usePresignedUrls';

// Get API URL from environment or use default
const API_URL = import.meta.env.VITE_API_URL || '/api';

const FaceGroupings = () => {
    // Video selection state
    const videos = useSelector(state => state.video.videos);
    const [selectedVideoId, setSelectedVideoId] = useState(null);
    
    // Modal state
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);

    // Use our custom hooks for face groups and URL management
    const {
        loading,
        error,
        setError,
        localFaceGroups,
        filteredGroups: sortedGroups,
        searchTerm,
        setSearchTerm,
        sortOption,
        setSortOption,
        filterOption,
        setFilterOption,
        handleUpdateGroupName,
        handleMoveFace,
        handleDeleteFace,
        moveGroup
    } = useFaceGroups(selectedVideoId);

    const { updateGroupsWithPresignedUrls } = usePresignedUrls(localFaceGroups, setError);

    // Filter only completed videos with face groups
    const completedVideos = Object.values(videos)
        .filter(video => video.status === 'completed');

    // Set the first completed video with face groups as default selection
    useEffect(() => {
        if (completedVideos.length > 0 && !selectedVideoId) {
            setSelectedVideoId(completedVideos[0].id);
        }
    }, [completedVideos, selectedVideoId]);

    // Update face group images with presigned URLs
    useEffect(() => {
        const fetchUrls = async () => {
            if (localFaceGroups.length) {
                const updatedGroups = await updateGroupsWithPresignedUrls(localFaceGroups);
                // No need to set state here as the hook manages that
            }
        };
        
        fetchUrls();
    }, [localFaceGroups.length, updateGroupsWithPresignedUrls]);

    const openGroupDetail = (groupId) => {
        const group = localFaceGroups.find(g => g.id === groupId);
        if (group) {
            setSelectedGroup(group);
            setDetailModalOpen(true);
        }
    };

    if (completedVideos.length === 0) {
        return (
            <CAlert color="info">
                <h5>No completed videos with face groups</h5>
                <p>Upload and process a video to see face groupings.</p>
            </CAlert>
        );
    }

    return (
        <DndProvider backend={HTML5Backend}>
            <CContainer>
                <CRow className="mb-4">
                    <CCol>
                        <h4 className="mb-3">
                            <CIcon icon={cilGroup} className="me-2" />
                            Face Groupings
                        </h4>
                    </CCol>
                </CRow>

                <CRow className="mb-4">
                    <CCol md={6}>
                        <VideoSelector 
                            videos={completedVideos}
                            selectedVideoId={selectedVideoId}
                            onSelectVideo={setSelectedVideoId}
                        />
                    </CCol>
                    <CCol md={6}>
                        <SearchAndFilterBar
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            sortOption={sortOption}
                            setSortOption={setSortOption}
                            filterOption={filterOption}
                            setFilterOption={setFilterOption}
                        />
                    </CCol>
                </CRow>

                {error && (
                    <CRow className="mb-3">
                        <CCol>
                            <CAlert color="danger" dismissible onClose={() => setError(null)}>
                                {error}
                            </CAlert>
                        </CCol>
                    </CRow>
                )}

                {loading ? (
                    <CRow className="my-5 text-center">
                        <CCol>
                            <CSpinner color="primary" />
                            <p className="mt-3">Loading face groups...</p>
                        </CCol>
                    </CRow>
                ) : selectedVideoId && (
                    <>
                        <CRow className="mb-3">
                            <CCol>
                                <CAlert color="info">
                                    Found {sortedGroups.length} distinct face groups
                                    {sortedGroups.length !== localFaceGroups.length &&
                                        ` (filtered from ${localFaceGroups.length} total)`}
                                </CAlert>
                                <p className="text-muted small">
                                    <CIcon icon={cilOptions} className="me-1" /> Drag and drop cards to reorder them. Click "View All Faces" to see details and edit group names.
                                </p>
                            </CCol>
                        </CRow>

                        {sortedGroups.length > 0 ? (
                            <CRow xs={{ cols: 1 }} md={{ cols: 2 }} lg={{ cols: 3 }} xl={{ cols: 4 }} className="g-4">
                                {sortedGroups.map((group, index) => (
                                    <CCol key={group.id}>
                                        <FaceGroupCard
                                            group={group}
                                            index={index}
                                            moveGroup={moveGroup}
                                            showDetail={openGroupDetail}
                                            API_URL={API_URL}
                                        />
                                    </CCol>
                                ))}
                            </CRow>
                        ) : (
                            <CAlert color="warning">
                                No face groups match your current filter criteria.
                            </CAlert>
                        )}
                    </>
                )}

                {/* Face Group Detail Modal */}
                {selectedGroup && (
                    <FaceDetailModal
                        show={detailModalOpen}
                        group={selectedGroup}
                        onClose={() => setDetailModalOpen(false)}
                        onUpdateGroupName={handleUpdateGroupName}
                        onMoveFace={handleMoveFace}
                        onDeleteFace={handleDeleteFace}
                        availableGroups={localFaceGroups.filter(g => g.id !== selectedGroup.id)}
                    />
                )}
            </CContainer>
        </DndProvider>
    );
};

export default FaceGroupings;