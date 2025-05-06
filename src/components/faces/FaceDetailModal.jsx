import React, { useState, useEffect, useCallback } from 'react';
import {
    CModal,
    CModalHeader,
    CModalTitle,
    CModalBody,
    CModalFooter,
    CButton,
    CRow,
    CCol,
    CFormInput,
    CForm,
    CFormLabel,
    CDropdown,
    CDropdownToggle,
    CDropdownMenu,
    CDropdownItem,
    CAlert,
    CCard,
    CCardBody,
    CCardImage,
    CBadge,
    CSpinner,
    CPopover
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilTrash, cilArrowCircleRight, cilPencil, cilSave, cilX, cilKeyboard, cilOptions } from '@coreui/icons';
import { fetchPresignedUrl } from '../../services/faceApiService';
import { hashStringToColor } from '../../utils/faceUtils';

// Add custom styles for better image handling
const styles = {
    imageContainer: {
        height: '120px',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#f8f9fa',
    },
    cardImage: {
        height: '100%',
        width: '100%',
        objectFit: 'cover',
    },
    imagePlaceholder: {
        height: '100%',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
    }
};

/**
 * Modal component for viewing and managing face group details
 */
const FaceDetailModal = ({
    show,
    group,
    onClose,
    onUpdateGroupName,
    onMoveFace,
    onDeleteFace,
    availableGroups,
    API_URL = '/api'
}) => {
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState('');
    const [loadingImages, setLoadingImages] = useState(false);
    const [faceImages, setFaceImages] = useState({});
    const [keyboardHelpVisible, setKeyboardHelpVisible] = useState(false);
    const [selectedFaces, setSelectedFaces] = useState([]);
    const [selectMode, setSelectMode] = useState(false);

    useEffect(() => {
        setSelectedFaces([]);
        setSelectMode(false);
    }, [group, show]);

    useEffect(() => {
        if (group) {
            setNewName(group.customName || `Group ${group.id}`);
        }
    }, [group]);

    const handleSaveName = () => {
        if (group && newName.trim() !== '') {
            onUpdateGroupName(group.id, newName.trim());
            setIsEditingName(false);
        }
    };

    const handleCancelEdit = () => {
        setNewName(group.customName || `Group ${group.id}`);
        setIsEditingName(false);
    };

    const toggleFaceSelection = (faceId) => {
        if (selectedFaces.includes(faceId)) {
            setSelectedFaces(selectedFaces.filter(id => id !== faceId));
        } else {
            setSelectedFaces([...selectedFaces, faceId]);
        }
    };

    const toggleSelectAll = () => {
        if (group && group.faces) {
            if (selectedFaces.length === group.faces.length) {
                setSelectedFaces([]);
            } else {
                setSelectedFaces(group.faces.map(face => face.id));
            }
        }
    };

    const handleBulkMove = (targetGroupId) => {
        if (selectedFaces.length === 0) return;

        selectedFaces.forEach(faceId => {
            onMoveFace(group.id, targetGroupId, faceId);
        });

        setSelectedFaces([]);
    };

    const handleBulkDelete = () => {
        if (selectedFaces.length === 0) return;

        selectedFaces.forEach(faceId => {
            onDeleteFace(group.id, faceId);
        });

        setSelectedFaces([]);
    };

    const handleKeyDown = useCallback((e) => {
        if (!show) return;

        if (e.key === '?') {
            setKeyboardHelpVisible(prev => !prev);
            return;
        }

        if (e.key === 'Escape') {
            if (selectMode) {
                setSelectMode(false);
                setSelectedFaces([]);
            } else if (isEditingName) {
                handleCancelEdit();
            } else {
                onClose();
            }
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !isEditingName) {
            e.preventDefault();
            if (selectMode) {
                toggleSelectAll();
            } else {
                setSelectMode(true);
                if (group && group.faces) {
                    setSelectedFaces(group.faces.map(face => face.id));
                }
            }
            return;
        }

        if (e.key === 's' && !isEditingName) {
            setSelectMode(prev => !prev);
            if (!selectMode) {
                setSelectedFaces([]);
            }
            return;
        }

        if (e.key === 'Enter' && !isEditingName && !selectMode) {
            setIsEditingName(true);
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 's' && isEditingName) {
            e.preventDefault();
            handleSaveName();
            return;
        }
    }, [show, isEditingName, selectMode, selectedFaces, onClose, handleCancelEdit, handleSaveName, group, toggleSelectAll]);

    useEffect(() => {
        if (show) {
            window.addEventListener('keydown', handleKeyDown);
            return () => {
                window.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [show, handleKeyDown]);

    useEffect(() => {
        const loadFaceImages = async () => {
            if (show && group && group.faces) {
                setLoadingImages(true);
                const imagePromises = {};

                for (const face of group.faces) {
                    if (face.presigned_url) {
                        imagePromises[face.id] = Promise.resolve(face.presigned_url);
                    } else if (face.image_url) {
                        if (face.image_url.startsWith('http')) {
                            imagePromises[face.id] = Promise.resolve(face.image_url);
                        } else {
                            try {
                                imagePromises[face.id] = fetchPresignedUrl(face.image_url);
                            } catch (error) {
                                console.error(`Error fetching presigned URL: ${error}`);
                                imagePromises[face.id] = Promise.resolve(`${API_URL}${face.image_url}`);
                            }
                        }
                    }
                }

                const urls = {};
                for (const [faceId, promise] of Object.entries(imagePromises)) {
                    try {
                        const url = await promise;
                        if (url) {
                            urls[faceId] = url;
                        }
                    } catch (error) {
                        console.error(`Error fetching URL for face ${faceId}:`, error);
                    }
                }

                setFaceImages(urls);
                setLoadingImages(false);
            }
        };

        loadFaceImages();
    }, [show, group, API_URL]);

    const renderKeyboardShortcutsHelp = () => (
        <CAlert color="info" className="mt-3 mb-3" dismissible onClose={() => setKeyboardHelpVisible(false)}>
            <h6>Keyboard Shortcuts</h6>
            <div className="small">
                <div><strong>?</strong> - Show/hide keyboard shortcuts</div>
                <div><strong>ESC</strong> - Close modal / cancel editing / exit selection mode</div>
                <div><strong>Enter</strong> - Start editing group name</div>
                <div><strong>Ctrl+S</strong> or <strong>⌘+S</strong> - Save group name</div>
                <div><strong>S</strong> - Toggle selection mode</div>
                <div><strong>Ctrl+A</strong> or <strong>⌘+A</strong> - Select all faces</div>
            </div>
        </CAlert>
    );

    const renderBulkActions = () => {
        if (!selectMode) return null;

        return (
            <div className="mb-3 p-2 bg-light rounded d-flex align-items-center">
                <div className="me-auto">
                    <strong>{selectedFaces.length} of {group.faces?.length || 0} selected</strong>
                    <CButton
                        color="link"
                        size="sm"
                        className="ms-2"
                        onClick={toggleSelectAll}
                    >
                        {selectedFaces.length === (group.faces?.length || 0) ? 'Deselect all' : 'Select all'}
                    </CButton>
                </div>

                {selectedFaces.length > 0 && (
                    <div>
                        <CDropdown className="me-2 d-inline-block">
                            <CDropdownToggle color="primary" size="sm">
                                Move Selected
                            </CDropdownToggle>
                            <CDropdownMenu>
                                {availableGroups
                                    .filter(g => g.id !== group.id)
                                    .map(targetGroup => (
                                        <CDropdownItem 
                                            key={targetGroup.id} 
                                            onClick={() => handleBulkMove(targetGroup.id)}
                                        >
                                            {targetGroup.customName || `Group ${targetGroup.id}`}
                                        </CDropdownItem>
                                    ))}
                            </CDropdownMenu>
                        </CDropdown>

                        <CButton
                            color="danger"
                            size="sm"
                            onClick={handleBulkDelete}
                        >
                            Delete Selected
                        </CButton>
                    </div>
                )}

                <CButton
                    color="secondary"
                    size="sm"
                    className="ms-2"
                    onClick={() => {
                        setSelectMode(false);
                        setSelectedFaces([]);
                    }}
                >
                    Exit Select Mode
                </CButton>
            </div>
        );
    };

    const renderFaceImage = (face, imageUrl, colorHash) => {
        if (imageUrl) {
            return (
                <div style={styles.imageContainer}>
                    <img
                        src={imageUrl}
                        alt={`Face ${face.id}`}
                        style={styles.cardImage}
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                    <div
                        style={{
                            ...styles.imagePlaceholder,
                            backgroundColor: colorHash,
                            display: 'none'
                        }}
                    >
                        <div>Image Error</div>
                    </div>
                </div>
            );
        } else {
            return (
                <div
                    style={{
                        ...styles.imagePlaceholder,
                        backgroundColor: colorHash
                    }}
                >
                    <div>No Image</div>
                </div>
            );
        }
    };

    if (!group) {
        return null;
    }

    return (
        <CModal size="lg" visible={show} onClose={onClose}>
            <CModalHeader closeButton>
                {isEditingName ? (
                    <CForm className="w-100">
                        <CRow>
                            <CCol>
                                <CFormInput
                                    type="text"
                                    id="groupName"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    autoFocus
                                />
                            </CCol>
                            <CCol xs="auto">
                                <CButton color="success" onClick={handleSaveName} className="me-2">
                                    <CIcon icon={cilSave} />
                                </CButton>
                                <CButton color="danger" onClick={handleCancelEdit}>
                                    <CIcon icon={cilX} />
                                </CButton>
                            </CCol>
                        </CRow>
                    </CForm>
                ) : (
                    <div className="d-flex align-items-center">
                        <CModalTitle>{group.customName || `Group ${group.id}`}</CModalTitle>
                        <CButton
                            color="light"
                            size="sm"
                            className="ms-2"
                            title="Edit name"
                            onClick={() => setIsEditingName(true)}
                        >
                            <CIcon icon={cilPencil} />
                        </CButton>

                        <CButton
                            color={selectMode ? "primary" : "light"}
                            size="sm"
                            className="ms-2"
                            title="Toggle selection mode"
                            onClick={() => setSelectMode(!selectMode)}
                        >
                            <CIcon icon={cilOptions} />
                        </CButton>

                        <CButton
                            color="link"
                            size="sm"
                            className="ms-2"
                            title="Keyboard shortcuts"
                            onClick={() => setKeyboardHelpVisible(prev => !prev)}
                        >
                            <CIcon icon={cilKeyboard} />
                        </CButton>
                    </div>
                )}
            </CModalHeader>

            <CModalBody>
                {keyboardHelpVisible && renderKeyboardShortcutsHelp()}

                {renderBulkActions()}

                <CRow className="mb-3">
                    <CCol>
                        <CBadge color="primary" className="me-2">
                            {group.face_count} faces
                        </CBadge>
                        <CBadge color="info">
                            {(group.confidence * 100).toFixed(1)}% confidence
                        </CBadge>
                    </CCol>
                </CRow>

                {loadingImages ? (
                    <div className="text-center my-5">
                        <CSpinner color="primary" />
                        <p className="text-muted mt-3">Loading face images...</p>
                    </div>
                ) : (
                    <CRow xs={{ cols: 2 }} md={{ cols: 3 }} lg={{ cols: 4 }} className="g-3">
                        {group.faces && group.faces.map((face) => {
                            const imageUrl = faceImages[face.id];
                            const isSelected = selectedFaces.includes(face.id);
                            const colorHash = hashStringToColor(face.id);

                            return (
                                <CCol key={face.id}>
                                    <CCard 
                                        className={`h-100 ${isSelected ? 'border-primary border-2' : ''}`}
                                        onClick={() => selectMode && toggleFaceSelection(face.id)}
                                    >
                                        <div className="position-relative">
                                            {selectMode && (
                                                <div 
                                                    className="position-absolute top-0 end-0 p-2"
                                                    style={{ zIndex: 100 }}
                                                >
                                                    <div 
                                                        className={`rounded-circle border ${isSelected ? 'bg-primary' : 'bg-light'}`}
                                                        style={{ width: '20px', height: '20px' }}
                                                    >
                                                        {isSelected && (
                                                            <div className="text-center text-white">
                                                                ✓
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {renderFaceImage(face, imageUrl, colorHash)}
                                        </div>
                                        <CCardBody className="p-2">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <small className="text-muted">
                                                    {face.timestamp ? new Date(face.timestamp * 1000).toISOString().substring(11, 19) : 'No timestamp'}
                                                </small>

                                                {!selectMode && (
                                                    <div className="btn-group">
                                                        <CDropdown variant="btn-group">
                                                            <CDropdownToggle color="light" size="sm">
                                                                <CIcon icon={cilArrowCircleRight} />
                                                            </CDropdownToggle>
                                                            <CDropdownMenu>
                                                                <CDropdownItem header="true">Move to group:</CDropdownItem>
                                                                {availableGroups
                                                                    .filter(targetGroup => targetGroup.id !== group.id)
                                                                    .map((targetGroup) => (
                                                                        <CDropdownItem
                                                                            key={targetGroup.id}
                                                                            onClick={() => onMoveFace(group.id, targetGroup.id, face.id)}
                                                                        >
                                                                            {targetGroup.customName || `Group ${targetGroup.id}`}
                                                                        </CDropdownItem>
                                                                    ))}
                                                            </CDropdownMenu>
                                                        </CDropdown>
                                                        <CButton
                                                            color="light"
                                                            size="sm"
                                                            className="text-danger"
                                                            onClick={() => onDeleteFace(group.id, face.id)}
                                                        >
                                                            <CIcon icon={cilTrash} />
                                                        </CButton>
                                                    </div>
                                                )}
                                            </div>
                                        </CCardBody>
                                    </CCard>
                                </CCol>
                            );
                        })}
                    </CRow>
                )}
            </CModalBody>

            <CModalFooter>
                <small className="text-muted me-auto">Press <strong>?</strong> for keyboard shortcuts</small>
                <CButton color="secondary" onClick={onClose}>
                    Close
                </CButton>
            </CModalFooter>
        </CModal>
    );
};

export default FaceDetailModal;