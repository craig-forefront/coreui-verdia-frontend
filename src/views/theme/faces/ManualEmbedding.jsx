import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CButton,
  CAlert,
  CSpinner,
  CFormCheck,
  CBadge,
  CTooltip,
  CButtonGroup,
  CProgress,
  CProgressBar
} from '@coreui/react';
import { useDropzone } from 'react-dropzone';

// Redux imports
import {
  setCurrentImage,
  clearCurrentImage,
  setManualBbox,
  addKeyPoint,
  removeLastKeyPoint,
  clearKeyPoints,
  setIsDrawing,
  setIsMarkingKeyPoints,
  detectFaces,
  generateEmbedding,
  setError,
  clearError,
  clearResults,
  selectCurrentImage,
  selectDetectedFaces,
  selectManualBbox,
  selectManualKeyPoints,
  selectIsDrawing,
  selectIsMarkingKeyPoints,
  selectIsDetecting,
  selectIsGeneratingEmbedding,
  selectEmbeddingResults,
  selectError,
  selectSuccess,
  selectProcessingStatus
} from '../../../store/faceProcessingSlice';

import {
  selectProcessingPreferences
} from '../../../store/userPreferencesSlice';

// Custom hooks
import useFileUpload from '../../../hooks/useFileUpload';
import useImageLoader from '../../../hooks/useImageLoader';
import useLocalStorage from '../../../hooks/useLocalStorage';

// Services
import faceApiService from '../../../services/faceApiService';

// Styles
import '../../../scss/manual-embedding.css';
import './manual-embedding.css';

const ManualEmbedding = () => {
  const dispatch = useDispatch();
  
  // Redux state selectors
  const currentImage = useSelector(selectCurrentImage);
  const detectedFaces = useSelector(selectDetectedFaces);
  const manualBbox = useSelector(selectManualBbox);
  const manualKeyPoints = useSelector(selectManualKeyPoints);
  const isDrawing = useSelector(selectIsDrawing);
  const isMarkingKeyPoints = useSelector(selectIsMarkingKeyPoints);
  const isDetecting = useSelector(selectIsDetecting);
  const isGeneratingEmbedding = useSelector(selectIsGeneratingEmbedding);
  const embeddingResults = useSelector(selectEmbeddingResults);
  const error = useSelector(selectError);
  const success = useSelector(selectSuccess);
  const status = useSelector(selectProcessingStatus);
  
  // User preferences
  const processingPrefs = useSelector(selectProcessingPreferences);
  
  // Local preferences with localStorage
  const [localPrefs, setLocalPrefs] = useLocalStorage('manualEmbeddingPrefs', {
    showDetectedFaces: true,
    showKeyPoints: true,
    autoDetectOnUpload: true,
    maxImageSize: { width: 1920, height: 1080 },
    imageQuality: 0.95
  });

  // Custom hooks for file handling
  const { 
    uploadFile, 
    progress: uploadProgress, 
    uploading: isProcessingImage 
  } = useFileUpload({
    accept: 'image/*',
    maxSize: 10 * 1024 * 1024, // 10MB
    onUploadComplete: handleImageProcessed,
    onProgress: (progress) => {
      // Progress is automatically tracked
    },
    onError: (error) => {
      dispatch(setError(`Failed to process image: ${error.message}`));
    }
  });

  // Image loading hook for canvas operations
  const { 
    loadImage, 
    imageUrls, 
    loadingStates,
    errors: imageErrors 
  } = useImageLoader();

  // Refs for canvas operations
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  // File processing with image resizing
  const resizeImageIfNeeded = useCallback(async (file) => {
    const { maxImageSize, imageQuality } = localPrefs;
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Check if image needs resizing
        if (img.width <= maxImageSize.width && img.height <= maxImageSize.height) {
          resolve(file);
          return;
        }
        
        // Calculate new dimensions while maintaining aspect ratio
        let newWidth = img.width;
        let newHeight = img.height;
        
        if (img.width > maxImageSize.width) {
          newWidth = maxImageSize.width;
          newHeight = (img.height * maxImageSize.width) / img.width;
        }
        
        if (newHeight > maxImageSize.height) {
          newHeight = maxImageSize.height;
          newWidth = (img.width * maxImageSize.height) / img.height;
        }
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            
            console.log(`Image resized from ${img.width}x${img.height} to ${newWidth}x${newHeight}`);
            resolve(resizedFile);
          } else {
            reject(new Error('Failed to resize image'));
          }
        }, file.type, imageQuality);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }, [localPrefs]);

  // Handle file upload and processing
  async function handleImageProcessed(file) {
    try {
      dispatch(clearError());
      
      const resizedFile = await resizeImageIfNeeded(file);
      const preview = URL.createObjectURL(resizedFile);
      
      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        dispatch(setCurrentImage({
          file: resizedFile,
          preview,
          dimensions: { width: img.width, height: img.height },
          originalFile: file
        }));
        
        // Auto-detect faces if preference is enabled
        if (localPrefs.autoDetectOnUpload) {
          dispatch(detectFaces(resizedFile));
        }
      };
      img.src = preview;
      
    } catch (error) {
      dispatch(setError(`Failed to process image: ${error.message}`));
    }
  }

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      uploadFile(file);
    }
  }, [uploadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  // Canvas drawing functions
  const getCanvasCoordinates = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  // Canvas event handlers using Redux actions
  const handleCanvasMouseDown = useCallback((e) => {
    const coords = getCanvasCoordinates(e);
    
    if (isMarkingKeyPoints) {
      // Add key point
      dispatch(addKeyPoint({ 
        x: coords.x, 
        y: coords.y, 
        type: manualKeyPoints.length < 5 ? ['left_eye', 'right_eye', 'nose', 'mouth_left', 'mouth_right'][manualKeyPoints.length] : 'extra'
      }));
    } else {
      // Start drawing bounding box
      dispatch(setIsDrawing(true));
      // Store drawing start coordinates in component state since it's temporary
      setDrawingStart(coords);
    }
  }, [dispatch, getCanvasCoordinates, isMarkingKeyPoints, manualKeyPoints.length]);

  const handleCanvasMouseMove = useCallback((e) => {
    if (!isDrawing || !drawingStart) return;
    
    const coords = getCanvasCoordinates(e);
    const currentBox = {
      x: Math.min(drawingStart.x, coords.x),
      y: Math.min(drawingStart.y, coords.y),
      width: Math.abs(coords.x - drawingStart.x),
      height: Math.abs(coords.y - drawingStart.y)
    };
    
    // Update preview box (local state for smooth drawing)
    setCurrentBbox(currentBox);
  }, [isDrawing, drawingStart, getCanvasCoordinates]);

  const handleCanvasMouseUp = useCallback(() => {
    if (isDrawing && currentBbox) {
      dispatch(setManualBbox(currentBbox));
      dispatch(setIsDrawing(false));
      setDrawingStart(null);
      setCurrentBbox(null);
    }
  }, [dispatch, isDrawing, currentBbox]);

  // Action handlers using Redux
  const handleDetectFaces = useCallback(() => {
    if (currentImage?.file) {
      dispatch(detectFaces(currentImage.file));
    }
  }, [dispatch, currentImage?.file]);

  const handleGenerateEmbedding = useCallback(() => {
    if (currentImage?.file && (manualBbox || detectedFaces.length > 0)) {
      const bbox = manualBbox || detectedFaces[0]?.bbox;
      dispatch(generateEmbedding({
        imageFile: currentImage.file,
        bbox,
        keyPoints: manualKeyPoints.length > 0 ? manualKeyPoints : null
      }));
    }
  }, [dispatch, currentImage?.file, manualBbox, detectedFaces, manualKeyPoints]);

  const handleClearManualAnnotations = useCallback(() => {
    dispatch(setManualBbox(null));
    dispatch(clearKeyPoints());
    dispatch(setIsDrawing(false));
    dispatch(setIsMarkingKeyPoints(false));
  }, [dispatch]);

  const handleRemoveLastKeyPoint = useCallback(() => {
    dispatch(removeLastKeyPoint());
  }, [dispatch]);

  const handleToggleKeyPointMode = useCallback(() => {
    dispatch(setIsMarkingKeyPoints(!isMarkingKeyPoints));
  }, [dispatch, isMarkingKeyPoints]);

  // Clear image and reset state
  const handleClearImage = useCallback(() => {
    if (currentImage?.preview) {
      URL.revokeObjectURL(currentImage.preview);
    }
    dispatch(clearCurrentImage());
    dispatch(clearResults());
    setDrawingStart(null);
    setCurrentBbox(null);
  }, [dispatch, currentImage?.preview]);

  // Canvas drawing effect
  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    
    if (!canvas || !image || !currentImage?.preview) return;
    
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    ctx.drawImage(image, 0, 0);
    
    // Draw detected faces
    if (localPrefs.showDetectedFaces && detectedFaces.length > 0) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      detectedFaces.forEach(face => {
        if (face.bbox) {
          ctx.strokeRect(face.bbox.x, face.bbox.y, face.bbox.width, face.bbox.height);
        }
        
        // Draw key points if available and enabled
        if (localPrefs.showKeyPoints && face.keypoints) {
          ctx.fillStyle = '#00ff00';
          face.keypoints.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
            ctx.fill();
          });
        }
      });
    }
    
    // Draw manual bounding box
    if (manualBbox) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.strokeRect(manualBbox.x, manualBbox.y, manualBbox.width, manualBbox.height);
    }
    
    // Draw current drawing box
    if (currentBbox) {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(currentBbox.x, currentBbox.y, currentBbox.width, currentBbox.height);
      ctx.setLineDash([]);
    }
    
    // Draw manual key points
    if (manualKeyPoints.length > 0) {
      ctx.fillStyle = '#ff0000';
      manualKeyPoints.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Label key points
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.fillText(`${index + 1}`, point.x + 6, point.y - 6);
        ctx.fillStyle = '#ff0000';
      });
    }
    
  }, [currentImage, detectedFaces, manualBbox, manualKeyPoints, currentBbox, localPrefs.showDetectedFaces, localPrefs.showKeyPoints]);

  // Local state for drawing (temporary, not in Redux)
  const [drawingStart, setDrawingStart] = useState(null);
  const [currentBbox, setCurrentBbox] = useState(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentImage?.preview) {
        URL.revokeObjectURL(currentImage.preview);
      }
    };
  }, [currentImage?.preview]);

  return (
    <CCard>
      <CCardHeader>
        <h5>Manual Face Embedding Generator</h5>
        <p className="text-muted mb-0">
          Upload an image to generate face embeddings with manual annotations
        </p>
      </CCardHeader>
      <CCardBody>
        {/* Status and Progress */}
        {(isProcessingImage || isDetecting || isGeneratingEmbedding) && (
          <CAlert color="info" className="mb-3">
            <div className="d-flex align-items-center">
              <CSpinner size="sm" className="me-2" />
              <div className="flex-grow-1">
                {isProcessingImage && 'Processing uploaded image...'}
                {isDetecting && 'Detecting faces...'}
                {isGeneratingEmbedding && 'Generating embeddings...'}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <CProgress className="mt-2" height={4}>
                    <CProgressBar value={uploadProgress} />
                  </CProgress>
                )}
              </div>
            </div>
          </CAlert>
        )}

        {/* Error Display */}
        {error && (
          <CAlert color="danger" dismissible onClose={() => dispatch(clearError())}>
            {error}
          </CAlert>
        )}

        {/* Success Display */}
        {success && (
          <CAlert color="success" dismissible onClose={() => dispatch(clearResults())}>
            {success}
          </CAlert>
        )}

        <CRow>
          <CCol md={6}>
            {/* File Upload Area */}
            {!currentImage && (
              <div
                {...getRootProps()}
                className={`dropzone ${isDragActive ? 'active' : ''}`}
                style={{
                  border: '2px dashed #ccc',
                  borderRadius: '8px',
                  padding: '40px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: isDragActive ? '#f0f8ff' : '#fafafa'
                }}
              >
                <input {...getInputProps()} />
                <div>
                  <h6>Drop an image here or click to browse</h6>
                  <p className="text-muted mb-0">
                    Supports: JPEG, PNG, GIF, BMP, WebP (max 10MB)
                  </p>
                </div>
              </div>
            )}

            {/* Image Display */}
            {currentImage && (
              <div className="position-relative">
                <img
                  ref={imageRef}
                  src={currentImage.preview}
                  alt="Uploaded"
                  className="img-fluid"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
                <canvas
                  ref={canvasRef}
                  className="position-absolute top-0 start-0"
                  style={{ 
                    width: '100%', 
                    height: 'auto',
                    cursor: isMarkingKeyPoints ? 'crosshair' : isDrawing ? 'crosshair' : 'default'
                  }}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                />
              </div>
            )}
          </CCol>

          <CCol md={6}>
            {/* Controls */}
            {currentImage && (
              <>
                {/* Preferences */}
                <CCard className="mb-3">
                  <CCardBody>
                    <h6>Display Options</h6>
                    <CFormCheck
                      checked={localPrefs.showDetectedFaces}
                      onChange={(e) => setLocalPrefs({
                        ...localPrefs,
                        showDetectedFaces: e.target.checked
                      })}
                      label="Show detected faces"
                    />
                    <CFormCheck
                      checked={localPrefs.showKeyPoints}
                      onChange={(e) => setLocalPrefs({
                        ...localPrefs,
                        showKeyPoints: e.target.checked
                      })}
                      label="Show key points"
                    />
                    <CFormCheck
                      checked={localPrefs.autoDetectOnUpload}
                      onChange={(e) => setLocalPrefs({
                        ...localPrefs,
                        autoDetectOnUpload: e.target.checked
                      })}
                      label="Auto-detect faces on upload"
                    />
                  </CCardBody>
                </CCard>

                {/* Face Detection */}
                <CCard className="mb-3">
                  <CCardBody>
                    <h6>Face Detection</h6>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span>Detected faces: {detectedFaces.length}</span>
                      <CButton
                        color="primary"
                        size="sm"
                        onClick={handleDetectFaces}
                        disabled={isDetecting}
                      >
                        {isDetecting ? <CSpinner size="sm" /> : 'Detect Faces'}
                      </CButton>
                    </div>
                  </CCardBody>
                </CCard>

                {/* Manual Annotations */}
                <CCard className="mb-3">
                  <CCardBody>
                    <h6>Manual Annotations</h6>
                    
                    <div className="mb-3">
                      <strong>Bounding Box:</strong>
                      {manualBbox ? (
                        <div className="text-success">
                          ✓ Manual box drawn
                          <CButton
                            color="outline-danger"
                            size="sm"
                            className="ms-2"
                            onClick={() => dispatch(setManualBbox(null))}
                          >
                            Clear
                          </CButton>
                        </div>
                      ) : (
                        <div className="text-muted">Draw on image to create</div>
                      )}
                    </div>

                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <strong>Key Points: {manualKeyPoints.length}</strong>
                        <CButtonGroup size="sm">
                          <CButton
                            color={isMarkingKeyPoints ? "success" : "outline-primary"}
                            onClick={handleToggleKeyPointMode}
                          >
                            {isMarkingKeyPoints ? 'Stop Marking' : 'Mark Points'}
                          </CButton>
                          {manualKeyPoints.length > 0 && (
                            <CButton
                              color="outline-warning"
                              onClick={handleRemoveLastKeyPoint}
                            >
                              Remove Last
                            </CButton>
                          )}
                        </CButtonGroup>
                      </div>
                      {isMarkingKeyPoints && (
                        <small className="text-info">
                          Click on the image to add key points (eyes, nose, mouth corners)
                        </small>
                      )}
                    </div>

                    <CButton
                      color="warning"
                      size="sm"
                      onClick={handleClearManualAnnotations}
                      disabled={!manualBbox && manualKeyPoints.length === 0}
                    >
                      Clear All Annotations
                    </CButton>
                  </CCardBody>
                </CCard>

                {/* Generate Embedding */}
                <CCard className="mb-3">
                  <CCardBody>
                    <h6>Generate Embedding</h6>
                    <CButton
                      color="success"
                      onClick={handleGenerateEmbedding}
                      disabled={
                        isGeneratingEmbedding || 
                        (!manualBbox && detectedFaces.length === 0)
                      }
                      className="w-100"
                    >
                      {isGeneratingEmbedding ? (
                        <>
                          <CSpinner size="sm" className="me-2" />
                          Generating...
                        </>
                      ) : (
                        'Generate Embedding'
                      )}
                    </CButton>
                    
                    {(!manualBbox && detectedFaces.length === 0) && (
                      <small className="text-muted d-block mt-2">
                        Detect faces or draw a manual bounding box first
                      </small>
                    )}
                  </CCardBody>
                </CCard>

                {/* Results */}
                {embeddingResults.length > 0 && (
                  <CCard>
                    <CCardBody>
                      <h6>Results</h6>
                      {embeddingResults.map((result, index) => (
                        <div key={index} className="mb-2">
                          <CBadge color="success" className="me-2">
                            Embedding {index + 1}
                          </CBadge>
                          <span className="small">
                            Vector length: {result.embedding?.length || 0}
                          </span>
                        </div>
                      ))}
                    </CCardBody>
                  </CCard>
                )}

                {/* Clear Image */}
                <div className="text-center mt-3">
                  <CButton
                    color="outline-secondary"
                    onClick={handleClearImage}
                  >
                    Upload New Image
                  </CButton>
                </div>
              </>
            )}
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  );
};

export default ManualEmbedding;
