import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
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

// Import our new Redux selectors and actions
import {
    selectSelectedFaces,
    selectIsSelectMode,
    selectIsFaceDetailModalOpen,
    selectKeyboardHelpVisible,
    setSelectedFaces,
    toggleSelectMode,
    setFaceDetailModalOpen,
    toggleKeyboardHelp,
    clearFaceSelection,
    toggleFaceSelection,
    selectAllFaces,
    deselectAllFaces
} from '../../store/uiSlice';

// Import custom hooks
import useModal from '../../hooks/useModal';
import useImageLoader from '../../hooks/useImageLoader';
import useLocalStorage from '../../hooks/useLocalStorage';

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
 * Refactored to use Redux for state management and custom hooks for common patterns
 */
const FaceDetailModal = ({
    group,
    onUpdateGroupName,
    onMoveFace,
    onDeleteFace,
    availableGroups,
    API_URL = '/api'
}) => {
    const dispatch = useDispatch();

    // Redux state selectors
    const selectedFaces = useSelector(selectSelectedFaces);
    const selectMode = useSelector(selectIsSelectMode);
    const show = useSelector(selectIsFaceDetailModalOpen);
    const keyboardHelpVisible = useSelector(selectKeyboardHelpVisible);

    // Local component state for editing
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState('');

    // User preferences with localStorage
    const [userPrefs, setUserPrefs] = useLocalStorage('faceModalPrefs', {
        showKeyboardHelp: false,
        autoSelectMode: false,
        imageLoadingStrategy: 'lazy'
    });

    // Modal management with custom hook
    const modalControls = useModal({
        isOpen: show,
        onClose: () => {
            dispatch(setFaceDetailModalOpen(false));
            dispatch(clearFaceSelection());
            setIsEditingName(false);
        },
        closeOnEscape: true,
        closeOnOutsideClick: false // Prevent accidental closes during selection
    });

    // Image loading with custom hook
    const {
        loadImages,
        loadingStates,
        imageUrls,
        errors: imageErrors,
        isLoading: loadingImages
    } = useImageLoader({
        strategy: userPrefs.imageLoadingStrategy
    });

    // Reset selections when group or modal visibility changes
    useEffect(() => {
        if (show && group) {
            dispatch(clearFaceSelection());
            setNewName(group.customName || `Group ${group.id}`);

            // Load face images
            if (group.faces && group.faces.length > 0) {
                const imageRequests = group.faces.map(face => {
                    if (face.presigned_url) {
                        return { id: face.id, url: face.presigned_url };
                    } else if (face.image_url) {
                        if (face.image_url.startsWith('http')) {
                            return { id: face.id, url: face.image_url };
                        } else {
                            return { id: face.id, url: `${API_URL}${face.image_url}` };
                        }
                    }
                    return null;
                }).filter(Boolean);

                loadImages(imageRequests);
            }
        }
    }, [show, group, dispatch, API_URL, loadImages]);

    // Update name when group changes
    useEffect(() => {
        if (group) {
            setNewName(group.customName || `Group ${group.id}`);
        }
    }, [group]);

    // Name editing handlers
    const handleSaveName = useCallback(() => {
        if (group && newName.trim() !== '') {
            onUpdateGroupName(group.id, newName.trim());
            setIsEditingName(false);
        }
    }, [group, newName, onUpdateGroupName]);

    const handleCancelEdit = useCallback(() => {
        setNewName(group?.customName || `Group ${group?.id}` || '');
        setIsEditingName(false);
    }, [group]);

    // Selection handlers using Redux actions
    const handleToggleFaceSelection = useCallback((faceId) => {
        dispatch(toggleFaceSelection(faceId));
    }, [dispatch]);

    const handleToggleSelectAll = useCallback(() => {
        if (!group?.faces) return;

        const allFaceIds = group.faces.map(face => face.id);
        if (selectedFaces.length === allFaceIds.length) {
            dispatch(deselectAllFaces());
        } else {
            dispatch(selectAllFaces(allFaceIds));
        }
    }, [dispatch, group?.faces, selectedFaces.length]);

    // Bulk action handlers
    const handleBulkMove = useCallback((targetGroupId) => {
        if (selectedFaces.length === 0) return;

        selectedFaces.forEach(faceId => {
            onMoveFace(group.id, targetGroupId, faceId);
        });

        dispatch(clearFaceSelection());
    }, [selectedFaces, group?.id, onMoveFace, dispatch]);

    const handleBulkDelete = useCallback(() => {
        if (selectedFaces.length === 0) return;

        selectedFaces.forEach(faceId => {
            onDeleteFace(group.id, faceId);
        });

        dispatch(clearFaceSelection());
    }, [selectedFaces, group?.id, onDeleteFace, dispatch]);

    // Keyboard shortcuts handler
    const handleKeyDown = useCallback((e) => {
        if (!show) return;

        switch (e.key) {
            case '?':
                dispatch(toggleKeyboardHelp());
                break;

            case 'Escape':
                if (selectMode) {
                    dispatch(toggleSelectMode());
                    dispatch(clearFaceSelection());
                } else if (isEditingName) {
                    handleCancelEdit();
                } else {
                    modalControls.close();
                }
                break;

            case 'a':
                if ((e.ctrlKey || e.metaKey) && !isEditingName) {
                    e.preventDefault();
                    if (selectMode) {
                        handleToggleSelectAll();
                    } else {
                        dispatch(toggleSelectMode());
                        if (group?.faces) {
                            dispatch(selectAllFaces(group.faces.map(face => face.id)));
                        }
                    }
                }
                break;

            case 's':
                if (!isEditingName) {
                    if (e.ctrlKey || e.metaKey) {
                        if (isEditingName) {
                            e.preventDefault();
                            handleSaveName();
                        }
                    } else {
                        dispatch(toggleSelectMode());
                        if (!selectMode) {
                            dispatch(clearFaceSelection());
                        }
                    }
                }
                break;

            case 'Enter':
                if (!isEditingName && !selectMode) {
                    setIsEditingName(true);
                }
                break;
        }
    }, [
        show, isEditingName, selectMode, selectedFaces,
        dispatch, modalControls, handleCancelEdit,
        handleSaveName, handleToggleSelectAll, group
    ]);

    // Attach keyboard event listener
    useEffect(() => {
        if (show) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [show, handleKeyDown]);

    // Render helper components
    const renderKeyboardShortcutsHelp = () => (
        <CAlert
            color="info"
            className="mt-3 mb-3"
            dismissible
            onClose={() => dispatch(toggleKeyboardHelp())}
        >
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
                    <strong>{selectedFaces.length} of {group?.faces?.length || 0} selected</strong>
                    <CButton
                        color="link"
                        size="sm"
                        className="ms-2"
                        onClick={handleToggleSelectAll}
                    >
                        {selectedFaces.length === (group?.faces?.length || 0) ? 'Deselect all' : 'Select all'}
                    </CButton>
                </div>

                {selectedFaces.length > 0 && (
                    <div>
                        <CDropdown className="me-2 d-inline-block">
                            <CDropdownToggle color="primary" size="sm">
                                Move Selected ({selectedFaces.length})
                            </CDropdownToggle>
                            <CDropdownMenu>
                                {availableGroups
                                    ?.filter(g => g.id !== group?.id)
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
                            Delete Selected ({selectedFaces.length})
                        </CButton>
                    </div>
                )}

                <CButton
                    color="secondary"
                    size="sm"
                    className="ms-2"
                    onClick={() => {
                        dispatch(toggleSelectMode());
                        dispatch(clearFaceSelection());
                    }}
                >
                    Exit Select Mode
                </CButton>
            </div>
        );
    };

    const renderFaceImage = (face, colorHash) => {
        const imageUrl = imageUrls[face.id];
        const isImageLoading = loadingStates[face.id];
        const imageError = imageErrors[face.id];

        if (isImageLoading) {
            return (
                <div style={styles.imageContainer}>
                    <div style={styles.imagePlaceholder}>
                        <CSpinner size="sm" />
                    </div>
                </div>
            );
        }

        if (imageUrl && !imageError) {
            return (
                <div style={styles.imageContainer}>
                    <img
                        src={imageUrl}
                        alt={`Face ${face.id}`}
                        style={styles.cardImage}
                        loading="lazy"
                    />
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
                    <div>{imageError ? 'Load Error' : 'No Image'}</div>
                </div>
            );
        }
    };

    if (!group) {
        return null;
    }

    return (
        <CModal
            size="lg"
            visible={show}
            onClose={modalControls.close}
            ref={modalControls.modalRef}
        >
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
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSaveName();
                                        } else if (e.key === 'Escape') {
                                            handleCancelEdit();
                                        }
                                    }}
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
                            title="Edit name (Enter)"
                            onClick={() => setIsEditingName(true)}
                        >
                            <CIcon icon={cilPencil} />
                        </CButton>

                        <CButton
                            color={selectMode ? "primary" : "light"}
                            size="sm"
                            className="ms-2"
                            title="Toggle selection mode (S)"
                            onClick={() => dispatch(toggleSelectMode())}
                        >
                            <CIcon icon={cilOptions} />
                            {selectMode && selectedFaces.length > 0 && (
                                <CBadge color="light" className="ms-1">
                                    {selectedFaces.length}
                                </CBadge>
                            )}
                        </CButton>

                        <CButton
                            color={keyboardHelpVisible ? "primary" : "link"}
                            size="sm"
                            className="ms-2"
                            title="Keyboard shortcuts (?)"
                            onClick={() => dispatch(toggleKeyboardHelp())}
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
                        <CBadge color="info" className="me-2">
                            {(group.confidence * 100).toFixed(1)}% confidence
                        </CBadge>
                        {loadingImages && (
                            <CBadge color="warning">
                                <CSpinner size="sm" className="me-1" />
                                Loading images...
                            </CBadge>
                        )}
                    </CCol>
                </CRow>

                <CRow xs={{ cols: 2 }} md={{ cols: 3 }} lg={{ cols: 4 }} className="g-3">
                    {group.faces && group.faces.map((face) => {
                        const isSelected = selectedFaces.includes(face.id);
                        const colorHash = hashStringToColor(face.id);

                        return (
                            <CCol key={face.id}>
                                <CCard
                                    className={`h-100 ${isSelected ? 'border-primary border-2' : ''} ${selectMode ? 'cursor-pointer' : ''}`}
                                    onClick={() => selectMode && handleToggleFaceSelection(face.id)}
                                    style={{ cursor: selectMode ? 'pointer' : 'default' }}
                                >
                                    <div className="position-relative">
                                        {selectMode && (
                                            <div
                                                className="position-absolute top-0 end-0 p-2"
                                                style={{ zIndex: 100 }}
                                            >
                                                <div
                                                    className={`rounded-circle border ${isSelected ? 'bg-primary border-primary' : 'bg-light border-secondary'}`}
                                                    style={{ width: '20px', height: '20px', lineHeight: '18px' }}
                                                >
                                                    {isSelected && (
                                                        <div className="text-center text-white small">
                                                            ✓
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {renderFaceImage(face, colorHash)}
                                    </div>
                                    <CCardBody className="p-2">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <small className="text-muted">
                                                {face.timestamp
                                                    ? new Date(face.timestamp * 1000).toISOString().substring(11, 19)
                                                    : 'No timestamp'
                                                }
                                            </small>

                                            {!selectMode && (
                                                <div className="btn-group">
                                                    <CDropdown variant="btn-group">
                                                        <CDropdownToggle color="light" size="sm">
                                                            <CIcon icon={cilArrowCircleRight} />
                                                        </CDropdownToggle>
                                                        <CDropdownMenu>
                                                            <CDropdownItem header>Move to group:</CDropdownItem>
                                                            {availableGroups
                                                                ?.filter(targetGroup => targetGroup.id !== group.id)
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
                                                        title="Delete face"
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
            </CModalBody>

            <CModalFooter>
                <small className="text-muted me-auto">
                    Press <strong>?</strong> for shortcuts
                    {selectMode && ` • ${selectedFaces.length} selected`}
                </small>
                <CButton color="secondary" onClick={modalControls.close}>
                    Close
                </CButton>
            </CModalFooter>
        </CModal>
    );
};

export default FaceDetailModal;
