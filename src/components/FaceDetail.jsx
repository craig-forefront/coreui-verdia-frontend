import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    CModal,
    CModalHeader,
    CModalTitle,
    CModalBody,
    CModalFooter,
    CButton,
    CRow,
    CCol,
    CCard,
    CCardBody,
    CCardImage,
    CFormInput,
    CBadge,
    CInputGroup,
    CInputGroupText,
    CTooltip,
    CSpinner
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilX, cilPencil, cilSave, cilTrash, cilArrowLeft, cilArrowRight } from '@coreui/icons';

// Get API URL from environment or use default
const API_URL = import.meta.env.VITE_API_URL || '/api';
const API_KEY = import.meta.env.REACT_APP_API_KEY;

// Create axios instance with default configs
const axiosInstance = axios.create({
    baseURL: API_URL,
    withCredentials: false,
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
    }
});

const FaceDetail = ({
    show,
    group,
    onClose,
    onUpdateGroupName,
    onMoveFace,
    onDeleteFace,
    availableGroups
}) => {
    const [groupName, setGroupName] = useState(group?.customName || `Group ${group?.id}`);
    const [isEditingName, setIsEditingName] = useState(false);
    const [faces, setFaces] = useState([]);
    const [selectedFace, setSelectedFace] = useState(null);
    const [loadedFaceImages, setLoadedFaceImages] = useState({});

    // Use face data from the group if available, otherwise create placeholder data
    const generateFaces = () => {
        if (!group) return [];

        // If the group has real face data, use it
        if (group.faces && group.faces.length > 0) {
            return group.faces.map(face => ({
                ...face,
                // Use presigned URL if available
                presignedUrl: face.presigned_url || null
            }));
        }

        // Otherwise, generate placeholder faces based on the face_count
        return Array.from({ length: group.face_count }).map((_, index) => ({
            id: `${group.id}_face_${index}`,
            confidence: (group.confidence * (0.85 + Math.random() * 0.3)).toFixed(2),
            selected: false
        }));
    };

    const fetchPresignedUrl = useCallback(async (imagePath) => {
        if (!imagePath) {
            console.warn('No image path provided to fetchPresignedUrl');
            return null;
        }
        
        try {
            console.log(`Fetching presigned URL for: ${imagePath}`);
            
            // Extract the face ID from the image path
            // For paths like "/faces/1234.jpg" or "faces/1234.jpg"
            const matches = imagePath.match(/faces\/([^/.]+)\.jpg/);
            if (matches && matches[1]) {
                const face_id = matches[1];
                const response = await axiosInstance.get(`/api/face-images/${face_id}`);
                
                console.log(`Received presigned URL response:`, response.data);
                
                if (response.data && response.data.url) {
                    return response.data.url;
                } else {
                    console.error('Received invalid presigned URL response structure:', response.data);
                    return null;
                }
            } else {
                // Fallback to the old method if we can't extract a face ID
                const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
                
                const response = await axiosInstance.get(`/api/face-images/presigned-url`, {
                    params: { imagePath: path }
                });
                
                console.log(`Received presigned URL response:`, response.data);
                
                if (response.data && response.data.url) {
                    return response.data.url;
                } else {
                    console.error('Received invalid presigned URL response structure:', response.data);
                    return null;
                }
            }
        } catch (error) {
            console.error(`Error fetching presigned URL for ${imagePath}:`, error);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            return null;
        }
    }, []);

    const updateFaceImageUrls = useCallback(async (faces) => {
        if (!faces || faces.length === 0) {
            console.log('No faces to update with URLs');
            setFaces([]);
            return;
        }
        
        console.log(`Updating face image URLs for ${faces.length} faces`);
        
        // Create a batch of promises for fetching URLs
        const facePromises = faces.map(async (face) => {
            if (face.image_url && typeof face.image_url === 'string') {
                try {
                    const presignedUrl = await fetchPresignedUrl(face.image_url);
                    return { ...face, presignedUrl };
                } catch (err) {
                    console.error(`Failed to fetch URL for face ${face.id}:`, err);
                    return face;
                }
            }
            return face;
        });
        
        try {
            // Process in smaller batches to avoid overwhelming the browser
            const batchSize = 10;
            const updatedFaces = [];
            
            for (let i = 0; i < facePromises.length; i += batchSize) {
                const batch = facePromises.slice(i, i + batchSize);
                const results = await Promise.all(batch);
                updatedFaces.push(...results);
                
                // Update faces incrementally so the UI doesn't appear frozen
                if (i + batchSize < facePromises.length) {
                    setFaces([...updatedFaces]);
                }
            }
            
            setFaces(updatedFaces);
            console.log(`Updated ${updatedFaces.length} faces with presigned URLs`);
        } catch (error) {
            console.error('Failed to update face image URLs:', error);
            // Still update with whatever we have to avoid completely failing
            const fallbackFaces = faces.map(face => ({
                ...face,
                presignedUrl: face.presigned_url || null
            }));
            setFaces(fallbackFaces);
        }
    }, [fetchPresignedUrl]);

    // Update faces when group changes
    useEffect(() => {
        if (group) {
            const generatedFaces = generateFaces();
            updateFaceImageUrls(generatedFaces);
            setGroupName(group.customName || `Group ${group.id}`);
        }
    }, [group, updateFaceImageUrls]);

    const handleSaveGroupName = () => {
        onUpdateGroupName(group.id, groupName);
        setIsEditingName(false);
    };

    const handleImageLoad = (faceId) => {
        setLoadedFaceImages(prev => ({
            ...prev,
            [faceId]: true
        }));
    };

    const renderFaceCard = (face) => {
        const isSelected = selectedFace === face.id;
        const faceImageLoaded = !!loadedFaceImages[face.id];

        // Check if the face has a presigned URL
        const hasPresignedUrl = face.presignedUrl && typeof face.presignedUrl === 'string';

        // Common styles for the card
        const cardStyle = {
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            transform: isSelected ? 'scale(1.05)' : 'scale(1)'
        };

        // Placeholder style
        const placeholderStyle = {
            height: '120px',
            display: faceImageLoaded ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#e9ecef',
            borderRadius: isSelected ? '3px' : '0'
        };

        // Image style
        const imageStyle = {
            height: '120px',
            objectFit: 'cover',
            display: faceImageLoaded ? 'block' : 'none',
            borderRadius: isSelected ? '3px' : '0'
        };

        return (
            <CCard
                className={`mb-2 ${isSelected ? 'border-primary border-2' : ''}`}
                onClick={() => setSelectedFace(isSelected ? null : face.id)}
                style={cardStyle}
            >
                {hasPresignedUrl ? (
                    <>
                        {/* Placeholder shown while image loads */}
                        <div style={placeholderStyle}>
                            <CSpinner color="primary" size="sm" />
                        </div>
                        
                        {/* Display face image using presigned URL if available */}
                        <CCardImage
                            orientation="top"
                            src={face.presignedUrl}
                            style={imageStyle}
                            onLoad={() => handleImageLoad(face.id)}
                        />
                    </>
                ) : (
                    // Fallback to colored placeholder
                    <div
                        className="face-placeholder"
                        style={{
                            backgroundColor: hashStringToColor(face.id),
                            height: '120px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 'bold',
                            borderRadius: isSelected ? '3px' : '0'
                        }}
                    >
                        <CIcon icon={cilPencil} size="xl" />
                    </div>
                )}
                <CCardBody>
                    <small>
                        Confidence: {typeof face.confidence === 'number'
                            ? (face.confidence * 100).toFixed(1)
                            : (parseFloat(face.confidence) * 100).toFixed(1)}%
                    </small>
                </CCardBody>
            </CCard>
        );
    };

    // Helper function to generate a color from a string
    const hashStringToColor = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }

        const hue = (hash % 360 + 360) % 360;
        return `hsl(${hue}, 65%, 50%)`;
    };

    return (
        <CModal visible={show} onClose={onClose} size="xl">
            <CModalHeader onClose={onClose}>
                <CModalTitle>
                    {isEditingName ? (
                        <CInputGroup>
                            <CFormInput
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                autoFocus
                            />
                            <CButton
                                color="primary"
                                onClick={handleSaveGroupName}
                                title="Save name"
                            >
                                <CIcon icon={cilSave} />
                            </CButton>
                            <CButton
                                color="secondary"
                                onClick={() => setIsEditingName(false)}
                                title="Cancel"
                            >
                                <CIcon icon={cilX} />
                            </CButton>
                        </CInputGroup>
                    ) : (
                        <>
                            {group?.customName || `Group ${group?.id}`}
                            <CButton
                                color="link"
                                className="ms-2 p-0"
                                onClick={() => setIsEditingName(true)}
                                title="Edit group name"
                            >
                                <CIcon icon={cilPencil} size="sm" />
                            </CButton>
                            <CBadge color="primary" shape="rounded-pill" className="ms-2">
                                {group?.face_count} faces
                            </CBadge>
                        </>
                    )}
                </CModalTitle>
            </CModalHeader>
            <CModalBody>
                {selectedFace && (
                    <div className="mb-3 p-2 bg-light rounded">
                        <div className="d-flex align-items-center mb-2">
                            <strong className="me-auto">Selected Face: {selectedFace}</strong>
                            <CButton
                                color="danger"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    onDeleteFace(group.id, selectedFace);
                                    setFaces(faces.filter(face => face.id !== selectedFace));
                                    setSelectedFace(null);
                                }}
                                title="Delete face"
                            >
                                <CIcon icon={cilTrash} />
                            </CButton>
                        </div>
                        <div>
                            <strong>Move to:</strong>
                            {availableGroups
                                .filter(g => g.id !== group.id)
                                .map(g => (
                                    <CTooltip content={`Move to ${g.customName || `Group ${g.id}`}`} key={g.id}>
                                        <CButton
                                            color="light"
                                            size="sm"
                                            className="me-1 mt-1"
                                            onClick={() => {
                                                onMoveFace(group.id, g.id, selectedFace);
                                                setFaces(faces.filter(face => face.id !== selectedFace));
                                                setSelectedFace(null);
                                            }}
                                        >
                                            {g.customName || `Group ${g.id}`}
                                        </CButton>
                                    </CTooltip>
                                ))
                            }
                        </div>
                    </div>
                )}
                <CRow xs={{ cols: 2 }} md={{ cols: 3 }} lg={{ cols: 4 }} xl={{ cols: 5 }}>
                    {faces.map(face => (
                        <CCol key={face.id}>
                            {renderFaceCard(face)}
                        </CCol>
                    ))}
                </CRow>
            </CModalBody>
            <CModalFooter>
                <CButton color="secondary" onClick={onClose}>Close</CButton>
            </CModalFooter>
        </CModal>
    );
};

export default FaceDetail;