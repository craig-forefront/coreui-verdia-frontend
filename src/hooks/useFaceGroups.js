import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
    fetchFaceGroups,
    updateFaceGroupName,
    moveFaceToGroup,
    deleteFaceFromGroup,
    reorderGroups
} from '../store/videoSlice';

/**
 * Custom hook to manage face group data, filtering, and sorting
 * @param {string} videoId - ID of the selected video
 * @returns {Object} - The face groups state and methods
 */
const useFaceGroups = (videoId) => {
    const dispatch = useDispatch();
    const videos = useSelector(state => state.video.videos);
    const [localFaceGroups, setLocalFaceGroups] = useState([]);
    const [filteredGroups, setFilteredGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Filter/sort state
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState('default');
    const [filterOption, setFilterOption] = useState('all');

    // Get the selected video object
    const selectedVideo = videoId ? videos[videoId] : null;

    // Fetch face groups when selected video changes
    useEffect(() => {
        if (videoId) {
            setLoading(true);
            setError(null);
            
            // Fetch face groups from the backend
            dispatch(fetchFaceGroups(videoId))
                .unwrap()
                .then(() => {
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching face groups:", err);
                    setError("Failed to load face groups. Please try again.");
                    setLoading(false);
                });
        }
    }, [videoId, dispatch]);

    // Create a mutable copy of face groups with added custom properties
    useEffect(() => {
        if (selectedVideo && selectedVideo.faceGroups) {
            // Create a mutable copy with additional custom properties
            setLocalFaceGroups(selectedVideo.faceGroups.map(group => ({
                ...group,
                customName: group.customName || null,
                tags: group.tags || [],
                // Deep copy face data if available
                faces: group.faces ? [...group.faces] : []
            })));
        } else {
            setLocalFaceGroups([]);
        }
    }, [selectedVideo]);

    // Filter and sort the face groups
    useEffect(() => {
        const filtered = localFaceGroups.filter(group => {
            // Apply search filter
            const nameMatches = (group.customName || `Group ${group.id}`).toLowerCase().includes(searchTerm.toLowerCase());

            // Apply confidence filter
            if (filterOption === 'high-confidence') {
                return nameMatches && group.confidence > 0.8;
            } else if (filterOption === 'low-confidence') {
                return nameMatches && group.confidence <= 0.8;
            }

            // If filter is "all", just check name
            return nameMatches;
        });

        // Sort the filtered groups
        const sorted = [...filtered].sort((a, b) => {
            switch (sortOption) {
                case 'name-asc':
                    return (a.customName || `Group ${a.id}`).localeCompare(b.customName || `Group ${b.id}`);
                case 'name-desc':
                    return (b.customName || `Group ${b.id}`).localeCompare(a.customName || `Group ${a.id}`);
                case 'count-asc':
                    return a.face_count - b.face_count;
                case 'count-desc':
                    return b.face_count - a.face_count;
                case 'confidence-asc':
                    return a.confidence - b.confidence;
                case 'confidence-desc':
                    return b.confidence - a.confidence;
                default:
                    return 0; // Maintain original order
            }
        });

        setFilteredGroups(sorted);
    }, [localFaceGroups, searchTerm, sortOption, filterOption]);

    // Group actions
    const handleUpdateGroupName = useCallback((groupId, newName) => {
        // Update local state for immediate feedback
        setLocalFaceGroups(localFaceGroups.map(group =>
            group.id === groupId ? { ...group, customName: newName } : group
        ));

        // Dispatch Redux action to update via API
        dispatch(updateFaceGroupName({
            videoId,
            groupId,
            newName
        }))
        .unwrap()
        .catch(err => {
            console.error("Error updating group name:", err);
            // Revert local state on error
            setError("Failed to update group name. Please try again.");
        });
    }, [dispatch, videoId, localFaceGroups]);

    const handleMoveFace = useCallback((fromGroupId, toGroupId, faceId) => {
        // Update local state for immediate feedback
        setLocalFaceGroups(localFaceGroups.map(group => {
            if (group.id === fromGroupId) {
                const updatedGroup = { 
                    ...group, 
                    face_count: group.face_count - 1,
                    faces: group.faces ? group.faces.filter(face => face.id !== faceId) : undefined
                };
                return updatedGroup;
            }
            if (group.id === toGroupId) {
                // If we have the face object, move it to the target group
                if (group.faces) {
                    const faceToMove = localFaceGroups
                        .find(g => g.id === fromGroupId)?.faces
                        ?.find(f => f.id === faceId);
                    
                    if (faceToMove) {
                        return {
                            ...group,
                            face_count: group.face_count + 1,
                            faces: [...(group.faces || []), faceToMove]
                        };
                    }
                }
                
                return { ...group, face_count: group.face_count + 1 };
            }
            return group;
        }));

        // Dispatch Redux action to update via API
        dispatch(moveFaceToGroup({
            videoId,
            fromGroupId,
            toGroupId,
            faceId
        }))
        .unwrap()
        .catch(err => {
            console.error("Error moving face:", err);
            // Revert local state on error by refetching groups
            dispatch(fetchFaceGroups(videoId));
            setError("Failed to move face. Please try again.");
        });
    }, [dispatch, videoId, localFaceGroups]);

    const handleDeleteFace = useCallback((groupId, faceId) => {
        // Update local state for immediate feedback
        setLocalFaceGroups(localFaceGroups.map(group => {
            if (group.id === groupId) {
                return { 
                    ...group, 
                    face_count: Math.max(0, group.face_count - 1),
                    faces: group.faces ? group.faces.filter(face => face.id !== faceId) : undefined
                };
            }
            return group;
        }));

        // Dispatch Redux action to update via API
        dispatch(deleteFaceFromGroup({
            videoId,
            groupId,
            faceId
        }))
        .unwrap()
        .catch(err => {
            console.error("Error deleting face:", err);
            // Revert local state on error by refetching groups
            dispatch(fetchFaceGroups(videoId));
            setError("Failed to delete face. Please try again.");
        });
    }, [dispatch, videoId, localFaceGroups]);

    // Function to reorder groups when dragged
    const moveGroup = useCallback((dragIndex, hoverIndex) => {
        const draggedGroup = filteredGroups[dragIndex];
        const newGroups = [...filteredGroups];
        newGroups.splice(dragIndex, 1);
        newGroups.splice(hoverIndex, 0, draggedGroup);

        // Dispatch Redux action to persist the new order
        dispatch(reorderGroups({
            videoId,
            newOrder: newGroups.map(group => group.id)
        }));
        
        // Update local state for immediate UI feedback
        // Build a map to find items in the original array
        const groupMap = {};
        localFaceGroups.forEach((group, index) => {
            groupMap[group.id] = { group, index };
        });
        
        const reorderedLocalGroups = [...localFaceGroups];
        newGroups.forEach((group, newIdx) => {
            const origInfo = groupMap[group.id];
            if (origInfo) {
                reorderedLocalGroups[origInfo.index] = group;
            }
        });
        
        setLocalFaceGroups(reorderedLocalGroups);
    }, [dispatch, videoId, filteredGroups, localFaceGroups]);

    return {
        loading,
        error,
        setError,
        localFaceGroups,
        filteredGroups,
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
    };
};

export default useFaceGroups;