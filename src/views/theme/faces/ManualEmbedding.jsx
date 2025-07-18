import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import faceApiService from '../../../services/faceApiService'
const { generateManualEmbedding, generateManualEmbeddingWithKeyPoints, detectFacesInsightFace } = faceApiService;
import '../../../scss/manual-embedding.css'
import './manual-embedding.css';

const ManualEmbedding = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Face detection states
  const [detectedFaces, setDetectedFaces] = useState([]);
  const [showDetectedFaces, setShowDetectedFaces] = useState(true);
  const [showKeyPoints, setShowKeyPoints] = useState(true);
  const [autoDetectCompleted, setAutoDetectCompleted] = useState(false);
  
  // Manual bounding box states
  const [isDrawing, setIsDrawing] = useState(false);
  const [manualBbox, setManualBbox] = useState(null);
  const [drawingStart, setDrawingStart] = useState(null);
  const [currentBbox, setCurrentBbox] = useState(null);
  
  // Manual key points states
  const [isMarkingKeyPoints, setIsMarkingKeyPoints] = useState(false);
  const [manualKeyPoints, setManualKeyPoints] = useState([]);

  // Debug logging
  useEffect(() => {
    console.log('Current state:', {
      isMarkingKeyPoints,
      manualKeyPointsCount: manualKeyPoints.length,
      manualKeyPoints: manualKeyPoints
    });
  }, [isMarkingKeyPoints, manualKeyPoints]);
  
  // Results states
  const [embeddingResults, setEmbeddingResults] = useState([]);
  
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  
  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setIsProcessingImage(true);
      setError(null);
      
      resizeImageIfNeeded(file).then((resizedFile) => {
        setSelectedFile(resizedFile);
        const preview = URL.createObjectURL(resizedFile);
        setImagePreview(preview);
        setSuccess(null);
        setDetectedFaces([]);
        setManualBbox(null);
        setEmbeddingResults([]);
        setAutoDetectCompleted(false);
        setIsProcessingImage(false);
      }).catch((err) => {
        console.error('Error resizing image:', err);
        setError('Failed to process image. Please try a different image.');
        setIsProcessingImage(false);
      });
    }
  }, []);

  // Image resizing function
  const resizeImageIfNeeded = (file) => {
    return new Promise((resolve, reject) => {
      const maxWidth = 1920;
      const maxHeight = 1080;
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Check if image needs resizing
        if (img.width <= maxWidth && img.height <= maxHeight) {
          // Image is within limits, return original
          resolve(file);
          return;
        }
        
        // Calculate new dimensions while maintaining aspect ratio
        let newWidth = img.width;
        let newHeight = img.height;
        
        if (img.width > maxWidth) {
          newWidth = maxWidth;
          newHeight = (img.height * maxWidth) / img.width;
        }
        
        if (newHeight > maxHeight) {
          newHeight = maxHeight;
          newWidth = (img.width * maxHeight) / img.height;
        }
        
        // Set canvas dimensions
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Draw and resize image
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) {
            // Create new file with same name but resized content
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            
            console.log(`Image resized from ${img.width}x${img.height} to ${newWidth}x${newHeight}`);
            resolve(resizedFile);
          } else {
            reject(new Error('Failed to resize image'));
          }
        }, file.type, 0.95); // Use 95% quality
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  // Auto-detect faces when image is loaded
  useEffect(() => {
    if (selectedFile && !autoDetectCompleted) {
      handleAutoDetectFaces();
    }
  }, [selectedFile, autoDetectCompleted]);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleAutoDetectFaces = async () => {
    if (!selectedFile) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await detectFacesInsightFace(selectedFile);
      setDetectedFaces(result.faces || []);
      setAutoDetectCompleted(true);
      console.log('Auto-detected faces:', result.faces);
    } catch (err) {
      console.error('Auto-detection failed:', err);
      setError('Failed to auto-detect faces. You can still draw manual bounding boxes.');
    } finally {
      setIsLoading(false);
    }
  };

  // Canvas drawing functions
  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleCanvasMouseDown = (e) => {
    if (!selectedFile) return;
    
    const coords = getCanvasCoordinates(e);
    console.log('Canvas clicked:', coords, 'isMarkingKeyPoints:', isMarkingKeyPoints);
    
    if (isMarkingKeyPoints) {
      // Add key point
      handleAddKeyPoint(coords);
    } else {
      // Draw bounding box
      setIsDrawing(true);
      setDrawingStart(coords);
      setCurrentBbox({
        x1: coords.x,
        y1: coords.y,
        x2: coords.x,
        y2: coords.y
      });
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDrawing || !drawingStart || isMarkingKeyPoints) return;
    
    const coords = getCanvasCoordinates(e);
    setCurrentBbox({
      x1: Math.min(drawingStart.x, coords.x),
      y1: Math.min(drawingStart.y, coords.y),
      x2: Math.max(drawingStart.x, coords.x),
      y2: Math.max(drawingStart.y, coords.y)
    });
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawing || !currentBbox || isMarkingKeyPoints) return;
    
    // Only set as manual bbox if it has meaningful size
    const width = currentBbox.x2 - currentBbox.x1;
    const height = currentBbox.y2 - currentBbox.y1;
    
    if (width > 10 && height > 10) {
      setManualBbox(currentBbox);
    }
    
    setIsDrawing(false);
    setDrawingStart(null);
    setCurrentBbox(null);
  };

  // Key point handling functions
  const handleAddKeyPoint = (coords) => {
    const maxPoints = 5; // Always use 5 key points
    
    if (manualKeyPoints.length < maxPoints) {
      setManualKeyPoints(prev => [...prev, [coords.x, coords.y]]);
      console.log('Added key point:', coords, 'Total points:', manualKeyPoints.length + 1);
    }
  };

  const removeLastKeyPoint = () => {
    setManualKeyPoints(prev => prev.slice(0, -1));
  };

  const clearAllKeyPoints = () => {
    setManualKeyPoints([]);
  };

  const toggleKeyPointMode = () => {
    setIsMarkingKeyPoints(!isMarkingKeyPoints);
    if (isMarkingKeyPoints) {
      // Exiting key point mode
      setManualKeyPoints([]);
    }
  };

  // Canvas drawing effect
  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    
    if (!canvas || !image || !imagePreview) return;
    
    const ctx = canvas.getContext('2d');
    
    // Wait for image to load and get proper dimensions
    const drawContent = () => {
      // Use a small delay to ensure image is properly rendered
      setTimeout(() => {
        const computedStyle = window.getComputedStyle(image);
        const displayWidth = parseFloat(computedStyle.width);
        const displayHeight = parseFloat(computedStyle.height);
        
        // Set canvas internal dimensions to match natural image size for high resolution
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        
        // Set canvas display size to match displayed image exactly
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw image
        ctx.drawImage(image, 0, 0);
        
        // Calculate scale factor for drawing elements based on image size
        const baseImageSize = 1920; // Reference size for original scaling
        const currentImageSize = Math.max(image.naturalWidth, image.naturalHeight);
        const scaleFactor = Math.min(currentImageSize / baseImageSize, 1); // Don't scale up, only down
        
        // Scaled sizes - bounding box thickness reduced by 75%
        const bboxLineWidth = Math.max(2, Math.round(6 * scaleFactor)); // Reduced from 24 to 6 (75% reduction)
        const autoKeyPointRadius = Math.max(2, Math.round(6 * scaleFactor));
        const manualKeyPointRadius = Math.max(4, Math.round(15 * scaleFactor));
        const keyPointBorderWidth = Math.max(1, Math.round(3 * scaleFactor));
        const fontSize = Math.max(10, Math.round(16 * scaleFactor));
        
        // Draw detected faces
        if (showDetectedFaces && detectedFaces.length > 0) {
          detectedFaces.forEach((face, index) => {
            const [x1, y1, x2, y2] = face.bbox;
            
            // Draw bounding box
            ctx.strokeStyle = '#32cd32'; // Lime green
            ctx.lineWidth = bboxLineWidth; // Scaled line width
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
            
            // Draw face index
            ctx.fillStyle = '#32cd32'; // Lime green
            ctx.font = `${fontSize}px Arial`; // Scaled font size
            ctx.fillText(`Face ${index + 1}`, x1, y1 - 5);
            
            // Draw key points
            if (showKeyPoints && face.key_points) {
              face.key_points.forEach(([x, y]) => {
                ctx.fillStyle = '#ffc107';
                ctx.beginPath();
                ctx.arc(x, y, autoKeyPointRadius, 0, 2 * Math.PI); // Scaled radius
                ctx.fill();
                
                // Add white border for better visibility
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.stroke();
              });
            }
          });
        }
        
        // Draw manual bounding box
        if (manualBbox) {
          const { x1, y1, x2, y2 } = manualBbox;
          ctx.strokeStyle = '#32cd32'; // Lime green
          ctx.lineWidth = bboxLineWidth; // Scaled line width
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
          ctx.setLineDash([]);
          
          // Draw label
          ctx.fillStyle = '#32cd32'; // Lime green
          ctx.font = `${fontSize}px Arial`; // Scaled font size
          ctx.fillText('Manual Selection', x1, y1 - 5);
        }
        
        // Draw manual key points
        if (manualKeyPoints.length > 0) {
          console.log('Drawing manual key points:', manualKeyPoints);
          manualKeyPoints.forEach(([x, y], index) => {
            // Draw a scaled circle with a border for better visibility
            ctx.fillStyle = '#ff1493'; // Deep pink for manual key points
            ctx.beginPath();
            ctx.arc(x, y, manualKeyPointRadius, 0, 2 * Math.PI); // Scaled radius
            ctx.fill();
            
            // Add white border - scaled thickness
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = keyPointBorderWidth; // Scaled border width
            ctx.stroke();
            
            // Draw key point number - scaled font
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${fontSize}px Arial`; // Scaled font size
            const textOffset = Math.round(manualKeyPointRadius * 0.4); // Scale text offset with radius
            ctx.fillText((index + 1).toString(), x - textOffset, y + textOffset);
          });
        }
        
        // Draw current drawing bbox
        if (currentBbox && isDrawing) {
          const { x1, y1, x2, y2 } = currentBbox;
          ctx.strokeStyle = '#007bff';
          ctx.lineWidth = bboxLineWidth; // Scaled line width
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
          ctx.setLineDash([]);
        }
      }, 100); // 100ms delay to ensure image is rendered
    };    if (image.complete) {
      drawContent();
    } else {
      image.onload = drawContent;
    }
  }, [imagePreview, detectedFaces, showDetectedFaces, showKeyPoints, manualBbox, currentBbox, isDrawing, manualKeyPoints]);

  const handleGenerateManualEmbedding = async () => {
    if (!selectedFile || !manualBbox) {
      setError('Please select an image and draw a bounding box first.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await generateManualEmbedding(selectedFile, manualBbox);
      
      const embeddingResult = {
        id: Date.now(),
        bbox: manualBbox,
        embedding: result.embedding,
        probe_id: result.probe_id || `manual_${Date.now()}`,
        image_size: result.image_size,
        face_size: result.face_size,
        timestamp: new Date().toLocaleString()
      };
      
      setEmbeddingResults(prev => [...prev, embeddingResult]);
      setSuccess(`Manual embedding generated successfully! Embedding dimension: ${result.embedding.length}`);
      
      // Clear manual bbox for next selection
      setManualBbox(null);
      
    } catch (err) {
      console.error('Manual embedding generation failed:', err);
      setError(err.response?.data?.detail || 'Failed to generate manual embedding. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateKeyPointEmbedding = async () => {
    if (!selectedFile || manualKeyPoints.length === 0) {
      setError('Please select an image and mark key points first.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await generateManualEmbeddingWithKeyPoints(selectedFile, manualKeyPoints);
      
      const embeddingResult = {
        id: Date.now(),
        keyPoints: manualKeyPoints,
        keyPointMode: '5',
        embedding: result.embedding,
        probe_id: result.probe_id || `manual_${Date.now()}`,
        image_size: result.image_size,
        face_size: result.face_size || 'N/A',
        timestamp: new Date().toLocaleString()
      };
      
      setEmbeddingResults(prev => [...prev, embeddingResult]);
      setSuccess(`Key point embedding generated successfully! Used ${manualKeyPoints.length} points. Embedding dimension: ${result.embedding.length}`);
      
      // Clear manual key points for next selection
      setManualKeyPoints([]);
      
    } catch (err) {
      console.error('Key point embedding generation failed:', err);
      
      // Check for specific error related to face detection in manual mode
      const errorMessage = err.response?.data?.detail || err.message || '';
      if (errorMessage.includes('No face detected') || errorMessage.includes('cropped region')) {
        setError(
          'Manual key point processing failed. This suggests the backend is trying to detect faces automatically instead of using your manual key points. ' +
          'The algorithm should generate embeddings directly from your key points without requiring automatic face detection. ' +
          'Please check the backend configuration for manual key point processing.'
        );
      } else {
        setError(err.response?.data?.detail || 'Failed to generate key point embedding. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDetectedFace = async (faceIndex) => {
    if (!selectedFile || !detectedFaces[faceIndex]) {
      return;
    }
    
    const face = detectedFaces[faceIndex];
    const [x1, y1, x2, y2] = face.bbox;
    const bbox = { x1, y1, x2, y2 };
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await generateManualEmbedding(selectedFile, bbox);
      
      const embeddingResult = {
        id: Date.now(),
        bbox: bbox,
        embedding: result.embedding,
        probe_id: result.probe_id || `auto_${Date.now()}`,
        image_size: result.image_size,
        face_size: result.face_size,
        timestamp: new Date().toLocaleString(),
        fromAutoDetection: true,
        faceIndex: faceIndex + 1,
        confidence: face.confidence,
        estimated_age: face.estimated_age,
        estimated_gender: face.estimated_gender
      };
      
      setEmbeddingResults(prev => [...prev, embeddingResult]);
      setSuccess(`Embedding generated for detected face ${faceIndex + 1}! Embedding dimension: ${result.embedding.length}`);
      
    } catch (err) {
      console.error('Embedding generation failed:', err);
      setError(err.response?.data?.detail || 'Failed to generate embedding. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearManualSelection = () => {
    setManualBbox(null);
  };

  const clearAllResults = () => {
    setEmbeddingResults([]);
    setSuccess(null);
  };

  return (
    <CRow>
      <CCol xs={12}>
        <CCard>
          <CCardHeader>
            <h4>Manual Face Embedding</h4>
            <p className="text-muted mb-0">
              Upload an image to automatically detect faces or manually draw bounding boxes to generate face embeddings.
              Uses InsightFace for detection and embedding generation.
            </p>
          </CCardHeader>
          <CCardBody>
            
            {/* File Upload Section */}
            <CRow className="mb-4">
              <CCol xs={12}>
                <div
                  {...getRootProps()}
                  className={`dropzone ${isDragActive ? 'active' : ''}`}
                  style={{
                    border: '2px dashed #ccc',
                    borderRadius: '10px',
                    padding: '40px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: isDragActive ? '#f8f9fa' : 'transparent'
                  }}
                >
                  <input {...getInputProps()} />
                  {isProcessingImage ? (
                    <div>
                      <CSpinner className="me-2" />
                      <p>Processing image...</p>
                      <p className="text-muted">Resizing if needed and preparing for upload</p>
                    </div>
                  ) : selectedFile ? (
                    <div>
                      <p><strong>Selected:</strong> {selectedFile.name}</p>
                      <p className="text-muted">Drop another image to replace, or click to browse</p>
                    </div>
                  ) : (
                    <div>
                      <p>Drag & drop an image here, or click to browse</p>
                      <p className="text-muted">Supports: JPEG, PNG, GIF, BMP, WebP (max 10MB)</p>
                      <p className="text-muted small">Large images will be automatically resized to 1920x1080 for processing</p>
                    </div>
                  )}
                </div>
              </CCol>
            </CRow>

            {/* Error/Success Messages */}
            {error && (
              <CAlert color="danger" dismissible onClose={() => setError(null)}>
                {error}
              </CAlert>
            )}
            
            {success && (
              <CAlert color="success" dismissible onClose={() => setSuccess(null)}>
                {success}
              </CAlert>
            )}

            {/* Image Display and Controls */}
            {imagePreview && (
              <CRow>
                <CCol md={8}>
                  <CCard>
                    <CCardHeader className="d-flex justify-content-between align-items-center">
                      <span>Image with Face Detection</span>
                      <CButtonGroup size="sm">
                        <CFormCheck 
                          id="showDetectedFaces"
                          label="Show Detected Faces"
                          checked={showDetectedFaces}
                          onChange={(e) => setShowDetectedFaces(e.target.checked)}
                        />
                        <CFormCheck 
                          id="showKeyPoints"
                          label="Show Key Points"
                          checked={showKeyPoints}
                          onChange={(e) => setShowKeyPoints(e.target.checked)}
                          className="ms-3"
                        />
                      </CButtonGroup>
                    </CCardHeader>
                    <CCardBody>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img
                          ref={imageRef}
                          src={imagePreview}
                          alt="Preview"
                          style={{ 
                            maxWidth: '100%', 
                            height: 'auto',
                            display: 'block'
                          }}
                          crossOrigin="anonymous"
                        />
                        <canvas
                          ref={canvasRef}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            cursor: 'crosshair'
                          }}
                          onMouseDown={handleCanvasMouseDown}
                          onMouseMove={handleCanvasMouseMove}
                          onMouseUp={handleCanvasMouseUp}
                        />
                      </div>
                      
                      <div className="mt-3">
                        <p className="text-muted">
                          <strong>Instructions:</strong> 
                          • Lime green boxes show auto-detected faces with key points (yellow dots)
                          • <strong>Bounding Box Mode:</strong> Click and drag to draw lime green manual bounding boxes
                          • <strong>Key Points Mode:</strong> Click to place pink key points on facial landmarks (works even without face detection)
                          • Manual key points should generate embeddings directly without requiring automatic face detection
                          • Use the mode controls to switch between bounding box and key point marking
                        </p>
                      </div>
                    </CCardBody>
                  </CCard>
                </CCol>

                <CCol md={4}>
                  {/* Detection Results */}
                  <CCard className="mb-3">
                    <CCardHeader>
                      Auto-Detected Faces ({detectedFaces.length})
                    </CCardHeader>
                    <CCardBody>
                      {isLoading && !autoDetectCompleted && (
                        <div className="text-center">
                          <CSpinner size="sm" className="me-2" />
                          Detecting faces...
                        </div>
                      )}
                      
                      {detectedFaces.length === 0 && autoDetectCompleted && (
                        <p className="text-muted">No faces detected automatically. You can draw manual bounding boxes.</p>
                      )}
                      
                      {detectedFaces.map((face, index) => (
                        <div key={index} className="mb-2 p-2 border rounded">
                          <div className="d-flex justify-content-between align-items-center">
                            <span><strong>Face {index + 1}</strong></span>
                            <CButton
                              size="sm"
                              color="success"
                              onClick={() => handleSelectDetectedFace(index)}
                              disabled={isLoading}
                            >
                              Generate Embedding
                            </CButton>
                          </div>
                          <div className="small text-muted mt-1">
                            {face.confidence && (
                              <div>Confidence: {(face.confidence * 100).toFixed(1)}%</div>
                            )}
                            {face.estimated_age && (
                              <div>Age: ~{face.estimated_age}</div>
                            )}
                            {face.estimated_gender !== null && (
                              <div>Gender: {face.estimated_gender === 0 ? 'Female' : 'Male'}</div>
                            )}
                            <div>Key Points: {face.key_points?.length || 0}</div>
                          </div>
                        </div>
                      ))}
                    </CCardBody>
                  </CCard>

                  {/* Mode Controls */}
                  <CCard className="mb-3">
                    <CCardHeader>Drawing Mode</CCardHeader>
                    <CCardBody>
                      <div className="d-flex gap-2 flex-wrap align-items-center">
                        <CButton
                          color={!isMarkingKeyPoints ? "primary" : "outline-primary"}
                          size="sm"
                          onClick={() => setIsMarkingKeyPoints(false)}
                        >
                          Bounding Box Mode
                        </CButton>
                        
                        <CButton
                          color={isMarkingKeyPoints ? "success" : "outline-success"}
                          size="sm"
                          onClick={() => setIsMarkingKeyPoints(true)}
                        >
                          Key Points Mode
                        </CButton>
                        
                        {isMarkingKeyPoints && (
                          <>
                            <CBadge color="info" size="sm">
                              5 Key Points Mode
                            </CBadge>
                            
                            <CButton
                              color="warning"
                              size="sm"
                              onClick={() => setManualKeyPoints([])}
                              disabled={manualKeyPoints.length === 0}
                            >
                              Clear Points ({manualKeyPoints.length}/5)
                            </CButton>
                          </>
                        )}
                      </div>
                      
                      <div className="mt-2">
                        <p className="text-muted small mb-0">
                          {isMarkingKeyPoints 
                            ? `Click on facial landmarks to place key points (${manualKeyPoints.length}/5 points) - Works without face detection!`
                            : 'Click and drag to draw bounding boxes around faces'
                          }
                        </p>
                      </div>
                    </CCardBody>
                  </CCard>

                  {/* Manual Selection */}
                  <CCard className="mb-3">
                    <CCardHeader>Manual Selection</CCardHeader>
                    <CCardBody>
                      {isMarkingKeyPoints ? (
                        // Key Points Mode
                        <div>
                          <p><strong>Key Points Mode (5 points)</strong></p>
                          <p className="small text-muted">
                            Points marked: {manualKeyPoints.length}/5
                          </p>
                          {manualKeyPoints.length > 0 && (
                            <div className="mb-2">
                              <small className="text-muted">
                                Points: {manualKeyPoints.map((point, idx) => 
                                  `(${Math.round(point[0])}, ${Math.round(point[1])})`
                                ).join(', ')}
                              </small>
                            </div>
                          )}
                          <div className="d-grid gap-2">
                            <CButton
                              color="success"
                              onClick={handleGenerateKeyPointEmbedding}
                              disabled={manualKeyPoints.length === 0 || isLoading}
                            >
                              {isLoading ? (
                                <>
                                  <CSpinner size="sm" className="me-2" />
                                  Generating...
                                </>
                              ) : (
                                'Generate Embedding with Key Points'
                              )}
                            </CButton>
                            <CButton
                              color="secondary"
                              variant="outline"
                              size="sm"
                              onClick={() => setManualKeyPoints([])}
                              disabled={manualKeyPoints.length === 0}
                            >
                              Clear Key Points
                            </CButton>
                          </div>
                        </div>
                      ) : (
                        // Bounding Box Mode
                        manualBbox ? (
                          <div>
                            <p><strong>Manual bounding box drawn</strong></p>
                            <p className="small text-muted">
                              Box: ({Math.round(manualBbox.x1)}, {Math.round(manualBbox.y1)}) → 
                              ({Math.round(manualBbox.x2)}, {Math.round(manualBbox.y2)})
                            </p>
                            <div className="d-grid gap-2">
                              <CButton
                                color="success"
                                onClick={handleGenerateManualEmbedding}
                                disabled={isLoading}
                              >
                                {isLoading ? (
                                  <>
                                    <CSpinner size="sm" className="me-2" />
                                    Generating...
                                  </>
                                ) : (
                                  'Generate Embedding'
                                )}
                              </CButton>
                              <CButton
                                color="secondary"
                                variant="outline"
                                size="sm"
                                onClick={clearManualSelection}
                              >
                                Clear Selection
                              </CButton>
                            </div>
                          </div>
                        ) : (
                          <p className="text-muted">
                            Click and drag on the image to draw a bounding box around a face.
                          </p>
                        )
                      )}
                    </CCardBody>
                  </CCard>
                </CCol>
              </CRow>
            )}

            {/* Results Section */}
            {embeddingResults.length > 0 && (
              <CRow className="mt-4">
                <CCol xs={12}>
                  <CCard>
                    <CCardHeader className="d-flex justify-content-between align-items-center">
                      <span>Generated Embeddings ({embeddingResults.length})</span>
                      <CButton
                        color="secondary"
                        variant="outline"
                        size="sm"
                        onClick={clearAllResults}
                      >
                        Clear All Results
                      </CButton>
                    </CCardHeader>
                    <CCardBody>
                      {embeddingResults.map((result) => (
                        <div key={result.id} className="mb-3 p-3 border rounded">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                              <h6>
                                {result.fromAutoDetection ? (
                                  <>Face {result.faceIndex} (Auto-detected)</>
                                ) : result.keyPoints ? (
                                  <>Key Points Selection (5 points)</>
                                ) : (
                                  'Manual Bounding Box'
                                )}
                                {result.confidence && (
                                  <CBadge color="info" className="ms-2">
                                    {(result.confidence * 100).toFixed(1)}% confidence
                                  </CBadge>
                                )}
                              </h6>
                              <p className="small text-muted mb-1">
                                Generated: {result.timestamp}
                              </p>
                            </div>
                            <CBadge color="success">
                              {result.embedding.length}D embedding
                            </CBadge>
                          </div>
                          
                          <div className="row">
                            <div className="col-md-6">
                              {result.keyPoints ? (
                                <>
                                  <p className="small mb-1"><strong>Key Points (5):</strong></p>
                                  <p className="small text-muted">
                                    {result.keyPoints.length} points marked manually
                                  </p>
                                  <details className="small">
                                    <summary className="text-muted" style={{ cursor: 'pointer' }}>
                                      View coordinates
                                    </summary>
                                    <div className="mt-1" style={{ maxHeight: '100px', overflowY: 'auto' }}>
                                      {result.keyPoints.map((point, idx) => (
                                        <div key={idx}>
                                          Point {idx + 1}: ({Math.round(point[0])}, {Math.round(point[1])})
                                        </div>
                                      ))}
                                    </div>
                                  </details>
                                </>
                              ) : (
                                <>
                                  <p className="small mb-1"><strong>Bounding Box:</strong></p>
                                  <p className="small text-muted">
                                    ({Math.round(result.bbox.x1)}, {Math.round(result.bbox.y1)}) → 
                                    ({Math.round(result.bbox.x2)}, {Math.round(result.bbox.y2)})
                                  </p>
                                </>
                              )}
                              <p className="small mb-1"><strong>Face Size:</strong></p>
                              <p className="small text-muted">
                                {result.face_size && typeof result.face_size === 'object' ? (
                                  <>
                                    {Math.round(result.face_size.width)} × {Math.round(result.face_size.height)} 
                                    ({Math.round(result.face_size.area)} px²)
                                  </>
                                ) : (
                                  result.face_size || 'N/A'
                                )}
                              </p>
                            </div>
                            <div className="col-md-6">
                              {result.estimated_age && (
                                <p className="small">
                                  <strong>Estimated Age:</strong> ~{result.estimated_age}
                                </p>
                              )}
                              {result.estimated_gender !== null && (
                                <p className="small">
                                  <strong>Gender:</strong> {result.estimated_gender === 0 ? 'Female' : 'Male'}
                                </p>
                              )}
                              <p className="small">
                                <strong>Probe ID:</strong> 
                                <code className="ms-1">
                                  {result.probe_id ? result.probe_id.substring(0, 8) + '...' : 'N/A'}
                                </code>
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-2">
                            <CTooltip content="Click to view full embedding vector">
                              <CButton
                                color="info"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(JSON.stringify(result.embedding, null, 2));
                                  setSuccess('Embedding vector copied to clipboard!');
                                }}
                              >
                                Copy Embedding Vector
                              </CButton>
                            </CTooltip>
                          </div>
                        </div>
                      ))}
                    </CCardBody>
                  </CCard>
                </CCol>
              </CRow>
            )}
            
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default ManualEmbedding;
