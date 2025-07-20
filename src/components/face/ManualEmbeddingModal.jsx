import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CCard,
  CCardBody,
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
} from '../../store/faceProcessingSlice';

import {
  selectProcessingPreferences
} from '../../store/userPreferencesSlice';

// Custom hooks
import useLocalStorage from '../../hooks/useLocalStorage';

// Styles
import './manual-embedding.css';

const ManualEmbeddingModal = ({ 
  visible, 
  onClose, 
  imageData, 
  existingDetections = [], 
  onDetectionsUpdate 
}) => {
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
  
  // Local state for drawing (must be before callbacks that use them)
  const [drawingStart, setDrawingStart] = useState(null);
  const [currentBbox, setCurrentBbox] = useState(null);
  const [newDetections, setNewDetections] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(1); // Add zoom state
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0, visible: false });
  const [isBboxDrawingEnabled, setIsBboxDrawingEnabled] = useState(false);
  
  // Local preferences with localStorage
  const [localPrefs, setLocalPrefs] = useLocalStorage('manualEmbeddingModalPrefs', {
    showExistingDetections: true,
    showManualDetections: true,
    showExistingKeypoints: true
  });

  // Refs for canvas operations
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  // Initialize image data when modal opens
  useEffect(() => {
    console.log('Modal visibility changed:', visible);
    console.log('Image data received:', imageData);
    
    if (visible && imageData && imageData.url) {
      console.log('Setting current image with URL:', imageData.url);
      
      // Convert imageData to the format expected by the component
      dispatch(setCurrentImage({
        file: null, // We don't have the original file
        preview: imageData.url,
        dimensions: { 
          width: imageData.imageSize?.[0] || 1920, 
          height: imageData.imageSize?.[1] || 1080 
        },
        originalFile: null
      }));
    } else if (visible && !imageData?.url) {
      console.warn('Modal opened but no image URL found in imageData:', imageData);
    }
  }, [visible, imageData, dispatch]); // Removed currentImage dependency to avoid loops

  // Clear state when modal closes
  useEffect(() => {
    if (!visible) {
      dispatch(clearCurrentImage());
      dispatch(clearResults());
      dispatch(clearError());
      dispatch(setIsDrawing(false));
      dispatch(setIsMarkingKeyPoints(false));
      dispatch(setManualBbox(null));
      dispatch(clearKeyPoints());
      setDrawingStart(null);
      setCurrentBbox(null);
      setNewDetections([]);
      setIsBboxDrawingEnabled(false);
    }
  }, [visible, dispatch]);

  // Canvas drawing functions
  const getCanvasCoordinates = useCallback((e) => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return { x: 0, y: 0 };
    
    const canvasRect = canvas.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    
    // Calculate the mouse position relative to the image (not the canvas container)
    const displayX = e.clientX - imgRect.left;
    const displayY = e.clientY - imgRect.top;
    
    // Check if click is within the image bounds
    if (displayX < 0 || displayY < 0 || displayX > imgRect.width || displayY > imgRect.height) {
      console.log('Click outside image bounds');
      return null;
    }
    
    // Convert from displayed image coordinates to natural image coordinates
    const scaleX = canvas.width / imgRect.width;
    const scaleY = canvas.height / imgRect.height;
    
    const coords = {
      x: displayX * scaleX,
      y: displayY * scaleY
    };
    
    console.log('Coordinate calculation:', {
      mouse: { clientX: e.clientX, clientY: e.clientY },
      imgRect: { left: imgRect.left, top: imgRect.top, width: imgRect.width, height: imgRect.height },
      display: { x: displayX, y: displayY },
      scale: { x: scaleX, y: scaleY },
      canvas: { width: canvas.width, height: canvas.height },
      final: coords
    });
    
    return coords;
  }, []);

  // Canvas event handlers using Redux actions
  const handleCanvasMouseDown = useCallback((e) => {
    console.log('🔥 MOUSE DOWN EVENT TRIGGERED!', {
      isMarkingKeyPoints,
      isBboxDrawingEnabled,
      manualBbox: !!manualBbox,
      target: e.target.tagName,
      button: e.button
    });
    
    e.preventDefault();
    e.stopPropagation();
    
    const coords = getCanvasCoordinates(e);
    if (!coords) {
      console.log('❌ Click outside image area');
      return;
    }
    
    console.log('✅ Valid coordinates:', coords);
    
    // Priority 1: Bounding box drawing when explicitly enabled
    if (isBboxDrawingEnabled && !manualBbox) {
      console.log('🎯 STARTING BBOX DRAWING!');
      dispatch(setIsDrawing(true));
      setDrawingStart(coords);
    } else if (isMarkingKeyPoints && manualBbox) {
      console.log('In keypoint marking mode');
      // Check if we already have 5 keypoints
      if (manualKeyPoints.length >= 5) {
        console.warn('Maximum of 5 keypoints allowed per bounding box');
        return;
      }
      
      // Check if the click is within the bounding box
      const withinBbox = coords.x >= manualBbox.x && 
                        coords.x <= manualBbox.x + manualBbox.width &&
                        coords.y >= manualBbox.y && 
                        coords.y <= manualBbox.y + manualBbox.height;
      
      if (!withinBbox) {
        console.warn('Keypoints must be placed within the bounding box');
        return;
      }
      
      // Add key point with proper face landmark labels
      const landmarkTypes = ['left_eye', 'right_eye', 'nose', 'mouth_left', 'mouth_right'];
      const pointType = landmarkTypes[manualKeyPoints.length];
      
      dispatch(addKeyPoint({ 
        x: coords.x, 
        y: coords.y, 
        type: pointType
      }));
    } else if (isMarkingKeyPoints && !manualBbox) {
      console.warn('Please draw a bounding box before marking keypoints');
    } else {
      console.log('❌ No drawing mode enabled or invalid state:', { 
        isBboxDrawingEnabled, 
        hasManualBbox: !!manualBbox,
        isMarkingKeyPoints 
      });
    }
  }, [dispatch, getCanvasCoordinates, isMarkingKeyPoints, manualKeyPoints.length, manualBbox, isBboxDrawingEnabled]);

  const handleCanvasMouseMove = useCallback((e) => {
    e.preventDefault();
    
    // Update cursor position for label - use viewport coordinates
    if (isMarkingKeyPoints && manualBbox) {
      setCursorPosition({
        x: e.clientX,
        y: e.clientY,
        visible: true
      });
    }
    
    if (!isDrawing || !drawingStart) return;
    
    const coords = getCanvasCoordinates(e);
    const currentBox = {
      x: Math.min(drawingStart.x, coords.x),
      y: Math.min(drawingStart.y, coords.y),
      width: Math.abs(coords.x - drawingStart.x),
      height: Math.abs(coords.y - drawingStart.y)
    };
    
    console.log('Mouse move - drawing box:', { currentBox, isDrawing, drawingStart });
    
    // Update preview box (local state for smooth drawing)
    setCurrentBbox(currentBox);
  }, [isDrawing, drawingStart, getCanvasCoordinates, isMarkingKeyPoints, manualBbox]);

  const handleCanvasMouseUp = useCallback((e) => {
    e.preventDefault();
    console.log('Mouse up:', { isDrawing, currentBbox });
    if (isDrawing && currentBbox) {
      console.log('Setting manual bbox:', currentBbox);
      dispatch(setManualBbox(currentBbox));
      dispatch(setIsDrawing(false));
      setDrawingStart(null);
      setCurrentBbox(null);
      // Auto-disable drawing mode after completing a box
      setIsBboxDrawingEnabled(false);
    }
  }, [dispatch, isDrawing, currentBbox]);

  // Mouse enter/leave handlers for cursor label
  const handleCanvasMouseEnter = useCallback(() => {
    if (isMarkingKeyPoints && manualBbox) {
      setCursorPosition(prev => ({ ...prev, visible: true }));
    }
  }, [isMarkingKeyPoints, manualBbox]);

  const handleCanvasMouseLeave = useCallback(() => {
    setCursorPosition(prev => ({ ...prev, visible: false }));
  }, []);

  // Canvas drawing helper functions
  const drawBoundingBox = useCallback((ctx, bbox, color, canvasWidth, canvasHeight) => {
    if (!bbox || !ctx) {
      console.warn('Missing bbox or context for drawing:', { bbox, ctx });
      return;
    }
    
    console.log('Drawing bounding box:', { bbox, color, canvasWidth, canvasHeight });
    
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3; // Make it more visible
    ctx.setLineDash([]);
    
    const x = bbox.x || 0;
    const y = bbox.y || 0;
    const width = bbox.width || 0;
    const height = bbox.height || 0;
    
    ctx.strokeRect(x, y, width, height);
    
    // Add a semi-transparent fill for better visibility
    ctx.fillStyle = color + '20'; // Add transparency
    ctx.fillRect(x, y, width, height);
    
    ctx.restore();
  }, []);

  const drawKeypoints = useCallback((ctx, keypoints, canvasWidth, canvasHeight, color = '#ff00ff', boundingBox = null) => {
    if (!keypoints || !ctx || keypoints.length === 0) return;
    
    // Calculate scale factor based on canvas display size and zoom
    const canvas = canvasRef.current;
    const canvasRect = canvas?.getBoundingClientRect();
    const displayScale = canvasRect ? (canvasRect.width / canvas.width) : 1;
    const effectiveZoomScale = Math.max(0.5, displayScale * zoomLevel); // Minimum scale of 0.5
    
    // Calculate bounding box based scale factor
    let bboxScale = 1.0;
    if (boundingBox && boundingBox.width && boundingBox.height) {
      // Use the smaller dimension (width or height) to ensure keypoints fit well
      const bboxSize = Math.min(boundingBox.width, boundingBox.height);
      // Scale based on bounding box size relative to a reference size (e.g., 100px)
      const referenceSize = 100;
      bboxScale = Math.max(0.3, Math.min(2.0, bboxSize / referenceSize)); // Clamp between 0.3x and 2.0x
      
      // Debug logging for manual keypoints
      console.log('🎯 Keypoint scaling debug:', {
        color,
        boundingBox,
        bboxSize,
        bboxScale,
        effectiveZoomScale,
        combinedScale: effectiveZoomScale * bboxScale
      });
    }
    
    // Combine zoom and bounding box scaling
    const combinedScale = effectiveZoomScale * bboxScale;
    
    ctx.save();
    keypoints.forEach((point, index) => {
      if (point && typeof point.x === 'number' && typeof point.y === 'number') {
        // Dynamic keypoint size based on combined scaling factors
        const baseRadius = 25; // Reduced base size from 35
        const scaledRadius = Math.max(8, baseRadius * combinedScale); // Minimum 8px radius
        
        // Draw keypoint circles in the specified color
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, scaledRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add thick white border with proportional thickness
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(2, 6 * combinedScale);
        ctx.stroke();
        
        // Dynamic font size and positioning
        const baseFontSize = 32; // Reduced base font from 48
        const scaledFontSize = Math.max(12, baseFontSize * combinedScale); // Minimum 12px
        const labelOffset = Math.max(12, 18 * combinedScale); // Increased separation from keypoint
        
        // Label the keypoint with dynamic text size
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${scaledFontSize}px Arial`;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(2, 4 * combinedScale); // Proportional stroke for readability
        const label = point.type || `KP${index + 1}`;
        ctx.strokeText(label, point.x + labelOffset, point.y - labelOffset);
        ctx.fillText(label, point.x + labelOffset, point.y - labelOffset);
      }
    });
    ctx.restore();
  }, [zoomLevel]);

  // Function to redraw all canvas elements
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !img) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate scale factors from original image to displayed image
    const originalWidth = imageData?.imageSize?.[0] || canvas.width;
    const originalHeight = imageData?.imageSize?.[1] || canvas.height;
    const scaleX = canvas.width / originalWidth;
    const scaleY = canvas.height / originalHeight;
    
    console.log('Canvas dimensions:', { width: canvas.width, height: canvas.height });
    console.log('Original image size:', [originalWidth, originalHeight]);
    console.log('Scale factors:', { scaleX, scaleY });
    
    // Draw existing detections
    if (localPrefs.showExistingDetections && existingDetections.length > 0) {
      existingDetections.forEach((detection, index) => {
        console.log('Original detection coordinates:', detection);
        
        // Scale coordinates from original image space to canvas space
        const scaledBbox = {
          x: detection.x * scaleX,
          y: detection.y * scaleY,
          width: detection.width * scaleX,
          height: detection.height * scaleY
        };
        
        console.log('Scaled detection coordinates:', scaledBbox);
        
        drawBoundingBox(ctx, scaledBbox, '#00ff00', canvas.width, canvas.height);
        
        // Label existing detections
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 16px Arial'; // Increased from 14px to 16px and made bold
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(`Existing ${index + 1}`, scaledBbox.x, scaledBbox.y - 10);
        ctx.fillText(`Existing ${index + 1}`, scaledBbox.x, scaledBbox.y - 10);
        
        // Draw keypoints for existing detections if they exist
        if (localPrefs.showExistingKeypoints && detection.keyPoints && detection.keyPoints.length > 0) {
          // Convert keypoints from original coordinates to canvas coordinates
          const scaledKeyPoints = detection.keyPoints.map(kp => ({
            ...kp,
            x: kp.x * scaleX,
            y: kp.y * scaleY
          }));
          // Use green color for existing detection keypoints, pass scaled bounding box for sizing
          drawKeypoints(ctx, scaledKeyPoints, canvas.width, canvas.height, '#00ff00', scaledBbox);
        }
      });
    }

    // Draw new detections (convert from original coordinates to canvas coordinates)
    if (localPrefs.showManualDetections && newDetections.length > 0) {
      newDetections.forEach((detection, index) => {
        // Scale coordinates from original image space to canvas space
        const scaledBbox = {
          x: detection.x * scaleX,
          y: detection.y * scaleY,
          width: detection.width * scaleX,
          height: detection.height * scaleY
        };
        
        // Draw manual detections in magenta
        drawBoundingBox(ctx, scaledBbox, '#ff00ff', canvas.width, canvas.height);
        
        // Label manual detections
        ctx.fillStyle = '#ff00ff';
        ctx.font = 'bold 16px Arial';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(`Manual ${index + 1}`, scaledBbox.x, scaledBbox.y - 10);
        ctx.fillText(`Manual ${index + 1}`, scaledBbox.x, scaledBbox.y - 10);
        
        // Draw keypoints for manual detections if they exist
        if (detection.keyPoints && detection.keyPoints.length > 0) {
          // Convert keypoints from original coordinates to canvas coordinates
          const scaledKeyPoints = detection.keyPoints.map(kp => ({
            ...kp,
            x: kp.x * scaleX,
            y: kp.y * scaleY
          }));
          drawKeypoints(ctx, scaledKeyPoints, canvas.width, canvas.height, '#ff00ff', scaledBbox);
        }
      });
    }
    
    // Draw manual bounding box (already in canvas coordinates) - use magenta
    if (manualBbox) {
      drawBoundingBox(ctx, manualBbox, '#ff00ff', canvas.width, canvas.height);
    }
    
    // Draw current drawing box (already in canvas coordinates) - use magenta while drawing
    if (currentBbox) {
      ctx.save();
      ctx.strokeStyle = '#ff00ff'; // Changed from yellow to magenta
      ctx.lineWidth = 6; // Changed thickness to 6px
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(currentBbox.x, currentBbox.y, currentBbox.width, currentBbox.height);
      ctx.restore();
    }
    
    // Draw manual key points (already in canvas coordinates) - use magenta
    if (localPrefs.showManualDetections && manualKeyPoints.length > 0) {
      // Pass the manual bounding box for proportional sizing
      drawKeypoints(ctx, manualKeyPoints, canvas.width, canvas.height, '#ff00ff', manualBbox);
    }
  }, [existingDetections, newDetections, manualBbox, currentBbox, manualKeyPoints, localPrefs, drawBoundingBox, drawKeypoints, imageData, zoomLevel]);

  // Effect to redraw canvas when state changes
  useEffect(() => {
    if (canvasRef.current && imageRef.current && currentImage) {
      redrawCanvas();
    }
  }, [currentImage, manualBbox, manualKeyPoints, currentBbox, newDetections, zoomLevel, redrawCanvas]);

  // Effect to update canvas positioning when zoom changes
  useEffect(() => {
    if (imageRef.current && canvasRef.current && currentImage) {
      const img = imageRef.current;
      const canvas = canvasRef.current;
      
      // Update canvas positioning to match zoomed image
      const updateCanvasPosition = () => {
        canvas.style.width = `${img.offsetWidth}px`;
        canvas.style.height = `${img.offsetHeight}px`;
        canvas.style.left = `${img.offsetLeft}px`;
        canvas.style.top = `${img.offsetTop}px`;
        
        // Redraw after positioning update
        setTimeout(() => redrawCanvas(), 50);
      };

      // Small delay to ensure the image has updated its size
      setTimeout(updateCanvasPosition, 100);
    }
  }, [zoomLevel, redrawCanvas]);

  // Effect to handle window resize and ensure canvas stays properly positioned and scaled
  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current && canvasRef.current && currentImage) {
        console.log('🔄 Window resized, updating canvas positioning and redrawing');
        
        // Small delay to ensure DOM has updated after resize
        setTimeout(() => {
          const img = imageRef.current;
          const canvas = canvasRef.current;
          
          if (img && canvas) {
            // Update canvas positioning to match resized image
            canvas.style.width = `${img.offsetWidth}px`;
            canvas.style.height = `${img.offsetHeight}px`;
            canvas.style.left = `${img.offsetLeft}px`;
            canvas.style.top = `${img.offsetTop}px`;
            
            // Redraw all elements with new scaling
            redrawCanvas();
          }
        }, 100);
      }
    };

    // ResizeObserver for more accurate container resize detection
    let resizeObserver;
    if (imageRef.current && canvasRef.current && currentImage) {
      const img = imageRef.current;
      const container = img.parentElement;
      
      resizeObserver = new ResizeObserver((entries) => {
        console.log('📐 Container resized via ResizeObserver');
        // Debounce the resize handler
        setTimeout(() => {
          if (imageRef.current && canvasRef.current) {
            const updatedImg = imageRef.current;
            const updatedCanvas = canvasRef.current;
            
            // Update canvas positioning
            updatedCanvas.style.width = `${updatedImg.offsetWidth}px`;
            updatedCanvas.style.height = `${updatedImg.offsetHeight}px`;
            updatedCanvas.style.left = `${updatedImg.offsetLeft}px`;
            updatedCanvas.style.top = `${updatedImg.offsetTop}px`;
            
            // Redraw with new scaling
            redrawCanvas();
          }
        }, 50);
      });
      
      if (container) {
        resizeObserver.observe(container);
      }
    }

    // Add resize listener as fallback
    window.addEventListener('resize', handleResize);
    
    // Cleanup listeners on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [currentImage, redrawCanvas]);

  // Action handlers using Redux
  const handleDetectFaces = useCallback(() => {
    // Since we don't have the original file, we'll simulate detection
    // In a real implementation, you might want to send the image URL to the backend
    console.log('Face detection would be triggered here');
  }, []);

  const handleGenerateEmbedding = useCallback(async () => {
    if (manualBbox || manualKeyPoints.length > 0) {
      // Convert canvas coordinates back to original image coordinates
      const canvas = canvasRef.current;
      const originalWidth = imageData?.imageSize?.[0] || canvas?.width || 1;
      const originalHeight = imageData?.imageSize?.[1] || canvas?.height || 1;
      const canvasWidth = canvas?.width || 1;
      const canvasHeight = canvas?.height || 1;
      
      const scaleX = originalWidth / canvasWidth;
      const scaleY = originalHeight / canvasHeight;
      
      console.log('Converting manual bbox to original coordinates:', {
        manualBbox,
        scaleFactors: { scaleX, scaleY },
        originalImageSize: [originalWidth, originalHeight],
        canvasSize: [canvasWidth, canvasHeight]
      });
      
      // Create a new detection object with coordinates in original image space
      const newDetection = {
        id: Date.now(), // Temporary ID
        x: manualBbox ? Math.round(manualBbox.x * scaleX) : 0,
        y: manualBbox ? Math.round(manualBbox.y * scaleY) : 0,
        width: manualBbox ? Math.round(manualBbox.width * scaleX) : 100,
        height: manualBbox ? Math.round(manualBbox.height * scaleY) : 100,
        estimatedAge: null,
        estimatedGender: null,
        confidence: null,
        faceSize: manualBbox ? Math.round(manualBbox.width * scaleX * manualBbox.height * scaleY) : null,
        embedding: null, // Would be generated by the backend
        keyPoints: manualKeyPoints.length > 0 ? manualKeyPoints.map(kp => ({
          ...kp,
          x: Math.round(kp.x * scaleX),
          y: Math.round(kp.y * scaleY)
        })) : null,
        isManual: true // Flag to indicate this was manually added
      };

      // Add to local new detections
      setNewDetections(prev => [...prev, newDetection]);
      
      // Clear current annotations to allow adding another detection
      dispatch(setManualBbox(null));
      dispatch(clearKeyPoints());
      dispatch(setIsDrawing(false));
      dispatch(setIsMarkingKeyPoints(false));
      setIsBboxDrawingEnabled(false);
      setDrawingStart(null);
      setCurrentBbox(null);
      
      console.log('New detection added (original coordinates):', newDetection);
    }
  }, [dispatch, manualBbox, manualKeyPoints, imageData]);

  const handleClearManualAnnotations = useCallback(() => {
    dispatch(setManualBbox(null));
    dispatch(clearKeyPoints());
    dispatch(setIsDrawing(false));
    dispatch(setIsMarkingKeyPoints(false));
    setIsBboxDrawingEnabled(false);
    setDrawingStart(null);
    setCurrentBbox(null);
  }, [dispatch]);

  const handleRemoveLastKeyPoint = useCallback(() => {
    dispatch(removeLastKeyPoint());
  }, [dispatch]);

  const handleToggleKeyPointMode = useCallback(() => {
    if (!manualBbox) {
      console.warn('Please draw a bounding box before marking keypoints');
      return;
    }
    dispatch(setIsMarkingKeyPoints(!isMarkingKeyPoints));
  }, [dispatch, isMarkingKeyPoints, manualBbox]);

  const handleToggleBboxDrawingMode = useCallback(() => {
    console.log('🔘 DRAW BOX BUTTON CLICKED!', { 
      currentState: isBboxDrawingEnabled, 
      newState: !isBboxDrawingEnabled,
      hasManualBbox: !!manualBbox 
    });
    setIsBboxDrawingEnabled(!isBboxDrawingEnabled);
    // If disabling, also disable drawing state
    if (isBboxDrawingEnabled) {
      dispatch(setIsDrawing(false));
      setDrawingStart(null);
      setCurrentBbox(null);
    }
  }, [isBboxDrawingEnabled, dispatch, manualBbox]);

  const handleClearBbox = useCallback(() => {
    dispatch(setManualBbox(null));
    setIsBboxDrawingEnabled(false);
    dispatch(setIsDrawing(false));
    setDrawingStart(null);
    setCurrentBbox(null);
  }, [dispatch]);

  // Auto-disable keypoint mode when 5 points are reached
  useEffect(() => {
    if (manualKeyPoints.length >= 5 && isMarkingKeyPoints) {
      dispatch(setIsMarkingKeyPoints(false));
    }
  }, [manualKeyPoints.length, isMarkingKeyPoints, dispatch]);

  const handleRemoveNewDetection = useCallback((detectionId) => {
    setNewDetections(prev => prev.filter(d => d.id !== detectionId));
  }, []);

  const handleSaveAndClose = useCallback(() => {
    if (newDetections.length > 0) {
      // Combine existing detections with new ones
      const updatedDetections = [...existingDetections, ...newDetections];
      onDetectionsUpdate?.(updatedDetections);
    }
    onClose();
  }, [newDetections, existingDetections, onDetectionsUpdate, onClose]);

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      size="xl"
      scrollable
      fullscreen
    >
      <CModalHeader>
        <CModalTitle>Add Manual Face Detections</CModalTitle>
      </CModalHeader>
      <CModalBody>
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
          <CCol md={8}>
            {/* Image Display */}
            {currentImage ? (
              <div 
                className="position-relative d-flex justify-content-center align-items-center"
                style={{ 
                  width: '100%', 
                  height: '70vh', // Use viewport height for better scaling
                  overflow: 'auto', // Change to auto to allow scrolling when zoomed
                  border: '1px solid var(--cui-border-color)',
                  backgroundColor: 'var(--cui-body-bg)'
                }}
              >
                {/* Zoom Controls */}
                <div 
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 1000,
                    display: 'flex',
                    gap: '5px',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    borderRadius: '4px',
                    padding: '5px'
                  }}
                >
                  <CButton
                    size="sm"
                    color="light"
                    onClick={() => setZoomLevel(prev => Math.max(0.25, prev - 0.25))}
                    disabled={zoomLevel <= 0.25}
                  >
                    −
                  </CButton>
                  <span style={{ color: 'white', padding: '0 10px', fontSize: '14px', lineHeight: '31px' }}>
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <CButton
                    size="sm"
                    color="light"
                    onClick={() => setZoomLevel(prev => Math.min(4, prev + 0.25))}
                    disabled={zoomLevel >= 4}
                  >
                    +
                  </CButton>
                  <CButton
                    size="sm"
                    color="light"
                    onClick={() => setZoomLevel(1)}
                  >
                    Reset
                  </CButton>
                </div>

                <img
                  ref={imageRef}
                  src={currentImage.preview}
                  alt="Detection Image"
                  style={{ 
                    maxWidth: 'none', // Remove max width constraint
                    maxHeight: 'none', // Remove max height constraint
                    width: `${zoomLevel * 100}%`, // Apply zoom
                    height: 'auto',
                    objectFit: 'contain'
                  }}
                  onLoad={() => {
                    console.log('🖼️ Image element loaded, syncing canvas');
                    if (imageRef.current && canvasRef.current) {
                      const img = imageRef.current;
                      const canvas = canvasRef.current;
                      const container = img.parentElement;
                      
                      console.log('Image dimensions:', {
                        natural: { width: img.naturalWidth, height: img.naturalHeight },
                        displayed: { width: img.offsetWidth, height: img.offsetHeight },
                        container: { width: container.offsetWidth, height: container.offsetHeight }
                      });
                      
                      // Set canvas resolution to match natural image size
                      canvas.width = img.naturalWidth;
                      canvas.height = img.naturalHeight;
                      
                      // Update canvas positioning to match image
                      canvas.style.width = `${img.offsetWidth}px`;
                      canvas.style.height = `${img.offsetHeight}px`;
                      canvas.style.left = `${img.offsetLeft}px`;
                      canvas.style.top = `${img.offsetTop}px`;
                      
                      console.log('Canvas setup complete');
                      
                      // Redraw all canvas elements
                      setTimeout(() => {
                        redrawCanvas();
                      }, 100); // Small delay to ensure positioning is complete
                    }
                  }}
                  onError={(e) => {
                    console.error('Failed to load image:', e);
                    console.error('Image URL:', currentImage.preview);
                  }}
                />
                <canvas
                  ref={canvasRef}
                  className="position-absolute"
                  style={{ 
                    cursor: isMarkingKeyPoints ? 'crosshair' : (isBboxDrawingEnabled || isDrawing) ? 'crosshair' : 'default',
                    pointerEvents: 'auto', // Ensure canvas can receive mouse events
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 10 // Ensure canvas is on top
                  }}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseEnter={handleCanvasMouseEnter}
                  onMouseLeave={handleCanvasMouseLeave}
                />
                
                {/* Cursor label close to crosshair for keypoint marking */}
                {isMarkingKeyPoints && manualBbox && cursorPosition.visible && manualKeyPoints.length < 5 && (
                  <div
                    style={{
                      position: 'fixed',
                      left: cursorPosition.x + 8, // Much closer to cursor
                      top: cursorPosition.y - 35, // Position above the crosshair
                      zIndex: 1001,
                      backgroundColor: '#ff00ff',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                      border: '1px solid white',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '9px', opacity: 0.9 }}>
                      {manualKeyPoints.length + 1}/5
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
                      {['Left Eye', 'Right Eye', 'Nose', 'Left Mouth', 'Right Mouth'][manualKeyPoints.length]}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-4 border rounded">
                <p className="text-muted">
                  {visible ? 'Loading image...' : 'No image available'}
                </p>
                {visible && imageData && (
                  <div className="mt-2">
                    <small className="text-muted">
                      Image URL: {imageData.url || 'No URL found'}<br/>
                      Image Size: {imageData.imageSize ? `${imageData.imageSize[0]}x${imageData.imageSize[1]}` : 'Unknown'}
                    </small>
                  </div>
                )}
              </div>
            )}
          </CCol>

          <CCol md={4}>
            {/* Display Options */}
            <CCard className="mb-3">
              <CCardBody>
                <h6>Display Options</h6>
                <CFormCheck
                  checked={localPrefs.showExistingDetections}
                  onChange={(e) => setLocalPrefs({
                    ...localPrefs,
                    showExistingDetections: e.target.checked
                  })}
                  label="Show existing detections (green)"
                />
                <CFormCheck
                  checked={localPrefs.showExistingKeypoints}
                  onChange={(e) => setLocalPrefs({
                    ...localPrefs,
                    showExistingKeypoints: e.target.checked
                  })}
                  label="Show existing keypoints (green circles)"
                />
                <CFormCheck
                  checked={localPrefs.showManualDetections}
                  onChange={(e) => setLocalPrefs({
                    ...localPrefs,
                    showManualDetections: e.target.checked
                  })}
                  label="Show manual detections & keypoints (magenta)"
                />
              </CCardBody>
            </CCard>

            {/* Manual Annotations */}
            <CCard className="mb-3">
              <CCardBody>
                <h6>Manual Face Detection</h6>
                <p className="text-muted small mb-3">
                  Bounding box defines the face region and keypoints improve alignment quality.
                </p>
                
                {/* Step-by-step workflow */}
                <div className="mb-3">
                  <div className="mb-2">
                    <strong>Step 1: Bounding Box {manualBbox ? '(✓ Complete)' : ''}</strong>
                  </div>
                  {manualBbox ? (
                    <div className="text-success mb-2">
                      Face region defined (magenta box)
                      {!isMarkingKeyPoints && manualKeyPoints.length === 0 && (
                        <CButton
                          color="outline-danger"
                          size="sm"
                          className="ms-2"
                          onClick={handleClearBbox}
                        >
                          Clear
                        </CButton>
                      )}
                    </div>
                  ) : isBboxDrawingEnabled ? (
                    <small className="text-info d-block mb-2">
                      Click and drag on the image to draw a bounding box around the face
                    </small>
                  ) : (
                    <small className="text-muted d-block mb-2">
                      Click "Draw Box" button then drag on image to define face region
                    </small>
                  )}
                  {!manualBbox && (
                    <CButton
                      color={isBboxDrawingEnabled ? "danger" : "primary"}
                      size="sm"
                      onClick={handleToggleBboxDrawingMode}
                      
                    >
                      {isBboxDrawingEnabled ? 'Stop Drawing' : 'Draw Box'}
                    </CButton>
                  )}
                </div>

                <div className="mb-3">
                  <div className="mb-2">
                    <strong>Step 2: Key Points ({manualKeyPoints.length}/5){manualKeyPoints.length >= 5 ? ' (✓ Complete)' : ''}</strong>
                  </div>
                  {isMarkingKeyPoints && manualBbox && manualKeyPoints.length < 5 && (
                    <small className="text-info d-block mb-2">
                      <strong>Step {manualKeyPoints.length + 1}:</strong> Click to mark {['left eye', 'right eye', 'nose', 'left mouth corner', 'right mouth corner'][manualKeyPoints.length]}
                      <br/>
                      <em>Follow the cursor label for guidance</em>
                    </small>
                  )}
                  {manualKeyPoints.length >= 5 && (
                    <small className="text-success d-block mb-2">
                      All 5 landmarks marked (optimal embedding quality)
                    </small>
                  )}
                  {manualKeyPoints.length > 0 && manualKeyPoints.length < 5 && !isMarkingKeyPoints && (
                    <small className="text-info d-block mb-2">
                      {manualKeyPoints.length}/5 landmarks marked (click "Mark Points" to continue)
                    </small>
                  )}
                  <div className="d-flex align-items-center gap-2 mb-3">
                    {manualKeyPoints.length < 5 && (
                      <CButton
                        color={isMarkingKeyPoints ? "danger" : "primary"}
                        size="sm"
                        onClick={handleToggleKeyPointMode}
                        disabled={!manualBbox}
                      >
                        {isMarkingKeyPoints ? 'Stop Marking' : 'Mark Points'}
                      </CButton>
                    )}
                    {!manualBbox && (
                      <small className="text-muted">
                        (Complete Step 1 first)
                      </small>
                    )}
                    {manualKeyPoints.length > 0 && manualKeyPoints.length < 5 && !isMarkingKeyPoints && (
                      <CButton
                        color="outline-warning"
                        size="sm"
                        onClick={handleRemoveLastKeyPoint}
                      >
                        Remove Last
                      </CButton>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="mb-2">
                    <strong>Step 3: Save Detection</strong>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <CButton
                      color="primary"
                      size="sm"
                      onClick={handleGenerateEmbedding}
                      disabled={!manualBbox && manualKeyPoints.length === 0}
                    >
                      Save Detection
                    </CButton>
                    {!manualBbox && (
                      <small className="text-muted">
                        (Complete Steps 1 and 2 first)
                      </small>
                    )}
                    {manualBbox && manualKeyPoints.length >= 5 && (
                      <CButton
                        color="danger"
                        size="sm"
                        onClick={handleClearManualAnnotations}
                      >
                        Clear All
                      </CButton>
                    )}
                  </div>
                  
                </div>
              </CCardBody>
            </CCard>

            {/* New Detections */}
            {newDetections.length > 0 && (
              <CCard className="mb-3">
                <CCardBody>
                  <h6>Manual Detections ({newDetections.length})</h6>
                  {newDetections.map((detection, index) => (
                    <div key={detection.id} className="mb-2 d-flex justify-content-between align-items-center">
                      <div>
                        <CBadge color="primary" className="me-2">
                          Detection {index + 1}
                        </CBadge>
                        <span className="small">
                          {Math.round(detection.width)}×{Math.round(detection.height)}px
                        </span>
                      </div>
                      <CButton
                        color="outline-danger"
                        size="sm"
                        onClick={() => handleRemoveNewDetection(detection.id)}
                      >
                        Remove
                      </CButton>
                    </div>
                  ))}
                </CCardBody>
              </CCard>
            )}

            {/* Existing Detections Info */}
            {existingDetections.length > 0 && (
              <CCard>
                <CCardBody>
                  <h6>Existing Detections ({existingDetections.length})</h6>
                  <p className="text-muted small mb-2">
                    These detections will be preserved when you save.
                  </p>
                  {existingDetections.map((detection, index) => (
                    <div key={index} className="mb-1 small">
                      <CBadge color="success" className="me-2">
                        Detection {index + 1}
                      </CBadge>
                      <span className="text-muted">
                        {Math.round(detection.width)}×{Math.round(detection.height)}px
                        {detection.keyPoints && detection.keyPoints.length > 0 && (
                          <span className="ms-2 text-info">
                            • {detection.keyPoints.length} keypoints
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </CCardBody>
              </CCard>
            )}
          </CCol>
        </CRow>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          Cancel
        </CButton>
        <CButton 
          color="primary" 
          onClick={handleSaveAndClose}
          disabled={newDetections.length === 0}
        >
          Save {newDetections.length > 0 && `(${newDetections.length} new)`}
        </CButton>
      </CModalFooter>
    </CModal>
  );
};

export default ManualEmbeddingModal;
