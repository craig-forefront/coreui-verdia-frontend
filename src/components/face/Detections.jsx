import React, { useState, useMemo, useEffect, Fragment } from 'react';
import { useLocation } from 'react-router-dom';
import { CRow, CCol, CButton, CFormCheck, CFormLabel, CBadge, CTooltip } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPencil } from '@coreui/icons';
import RangeSlider from 'react-range-slider-input';
import 'react-range-slider-input/dist/style.css';
import './detections.css';
import ManualEmbeddingModal from './ManualEmbeddingModal';

// Gender labels for display
const GENDER_LABELS = {
  0: 'Female',
  1: 'Male',
  null: 'Unknown'
};

// Helper function to format confidence score as percentage
const formatConfidence = (score) => {
  return score !== null && score !== undefined
    ? `${Math.round(score * 100)}%`
    : 'N/A';
};

// Custom CSS to style the range slider
const sliderStyle = {
  marginBottom: '15px',
};

const rangeStyle = {
  textAlign: 'center',
  marginTop: '10px',
};

const buttonStyle = {
  marginTop: '15px', // Add padding above the button
  textAlign: 'center', // Center the button
};

const checkboxStyle = {
  marginBottom: '15px',
};

const faceBadgeStyle = {
  position: 'absolute',
  top: '-24px',
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '2px 6px',
  fontSize: '0.7rem',
  zIndex: 100,
  display: 'flex',
  gap: '5px',
  whiteSpace: 'nowrap'
};

const Detections = () => {
  console.log('======= DETECTIONS COMPONENT MOUNTED =======');

  const location = useLocation();
  const apiResponse = location.state?.detectionResults;

  // Add detailed console logging for debugging
  useEffect(() => {
    console.log('==== DETECTIONS DEBUG INFO ====');
    console.log('Location state received:', location.state);
    console.log('API Response (detectionResults):', apiResponse);

    if (Array.isArray(apiResponse)) {
      console.log('API Response is an array with', apiResponse.length, 'items');
      apiResponse.forEach((result, idx) => {
        console.log(`Result ${idx + 1}:`, {
          probeId: result.probe_id || result.probeid,
          imageSize: result.image_size,
          imageSizeObj: result.imagesize,
          allKeys: Object.keys(result),
          numFaces: result?.faces?.length || 0,
          imagePreviewUrl: result.imagePreviewUrl ? 'Present' : 'Missing',
          originalFilename: result.originalFilename || 'Not available'
        });
      });
    } else if (apiResponse) {
      console.log('API Response is not an array but an object:', {
        probeId: apiResponse.probe_id || apiResponse.probeid,
        imageSize: apiResponse.image_size,
        imageSizeObj: apiResponse.imagesize,
        allKeys: Object.keys(apiResponse),
        numFaces: apiResponse?.faces?.length || 0,
      });
    } else {
      console.log('No API Response data found in location state');
    }
  }, [location, apiResponse]);

  // Process the API response to match the expected format
  const processedData = useMemo(() => {
    // Normalize apiResponse to always be an array
    const responseArray = apiResponse
      ? Array.isArray(apiResponse) ? apiResponse : [apiResponse]
      : [];

    if (responseArray.length === 0) return [];

    return responseArray.map((result, index) => {
      // Handle both 'imagesize' (object) and 'image_size' (array)
      let imageSizeArray = null;
      if (result.image_size && Array.isArray(result.image_size)) {
        imageSizeArray = result.image_size;
      } else if (result.imagesize && typeof result.imagesize === 'object') {
        imageSizeArray = [result.imagesize.width, result.imagesize.height];
      }

      console.log(`🎯 Processing image ${index}:`, {
        imageSize: imageSizeArray,
        rawImageSize: result.image_size,
        rawImageSizeObj: result.imagesize,
        hasImageSizeArray: result.image_size && Array.isArray(result.image_size),
        hasImageSizeObj: result.imagesize && typeof result.imagesize === 'object',
        facesCount: result.faces?.length || 0,
        firstFaceBbox: result.faces?.[0]?.bbox
      });

      return {
        url: result.imagePreviewUrl || null,
        probeId: result.probe_id || result.probeid, // Handle both casings
        imageSize: imageSizeArray,
        boundingBoxes: result.faces?.map((face, idx) => {
          // InsightFace returns bbox as [x1, y1, x2, y2] in pixel coordinates
          const [x1, y1, x2, y2] = face.bbox;

          console.log(`🔍 Face ${idx + 1} raw bbox:`, face.bbox);
          console.log(`📐 Converted to x,y,w,h:`, {
            x: x1,
            y: y1,
            width: x2 - x1,
            height: y2 - y1
          });

          // Check for keypoints in the face data (InsightFace typically provides kps)
          let keyPoints = null;
          if (face.kps && Array.isArray(face.kps)) {
            // InsightFace returns keypoints as flat array [x1, y1, x2, y2, x3, y3, x4, y4, x5, y5]
            // Convert to array of {x, y, type} objects
            const keypointTypes = ['left_eye', 'right_eye', 'nose', 'mouth_left', 'mouth_right'];
            keyPoints = [];
            for (let i = 0; i < face.kps.length; i += 2) {
              if (i + 1 < face.kps.length) {
                keyPoints.push({
                  x: face.kps[i],
                  y: face.kps[i + 1],
                  type: keypointTypes[Math.floor(i / 2)] || `kp${Math.floor(i / 2) + 1}`
                });
              }
            }
          } else if (face.keypoints && Array.isArray(face.keypoints)) {
            // Handle alternative keypoint format
            keyPoints = face.keypoints.map((kp, kpIdx) => ({
              x: kp.x || kp[0],
              y: kp.y || kp[1],
              type: kp.type || ['left_eye', 'right_eye', 'nose', 'mouth_left', 'mouth_right'][kpIdx] || `kp${kpIdx + 1}`
            }));
          } else if (face.landmarks && Array.isArray(face.landmarks)) {
            // Handle landmarks format
            keyPoints = face.landmarks.map((lm, lmIdx) => ({
              x: lm.x || lm[0],
              y: lm.y || lm[1],
              type: lm.type || ['left_eye', 'right_eye', 'nose', 'mouth_left', 'mouth_right'][lmIdx] || `lm${lmIdx + 1}`
            }));
          }

          console.log(`🔍 Face ${idx + 1} keypoints:`, keyPoints);

          return {
            id: idx + 1,
            x: x1,
            y: y1,
            width: x2 - x1,
            height: y2 - y1,
            estimatedAge: face.estimated_age || face.estimatedage,
            estimatedGender: face.estimated_gender ?? face.estimatedgender,
            confidence: face.confidence,
            faceSize: face.face_size || face.facesize,
            embedding: face.embedding,
            keyPoints: keyPoints
          };
        }) || []
      };
    });
  }, [apiResponse]);

  const imagesData = processedData;

  // Log processed data for debugging
  useEffect(() => {
    console.log('Final processed data:', imagesData);
  }, [imagesData]);

  const initialSelectedBoxes = imagesData.flatMap((imgData, imgIndex) =>
    imgData.boundingBoxes.map((box) => `${imgIndex}-${box.id}`)
  );
  const [selectedBoxes, setSelectedBoxes] = useState(initialSelectedBoxes);
  const [largestOnly, setLargestOnly] = useState(false);

  // Change ageRange state type to array for react-range-slider-input
  const [ageRange, setAgeRange] = useState([18, 100]);
  const [nameScore, setNameScore] = useState([80, 100]);
  const [detectionScore, setDetectionScore] = useState([60, 100]);

  const [scales, setScales] = useState({});

  // Modal state for manual embedding
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImageData, setSelectedImageData] = useState(null);
  const [modifiedDetections, setModifiedDetections] = useState({});

  // Add throttling to prevent excessive scale calculations
  const [scaleCalculationTimeout, setScaleCalculationTimeout] = useState({});
  const [imageLoadFlags, setImageLoadFlags] = useState({});

  // Add a resize observer to handle container size changes
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const container = entry.target;
        const img = container.querySelector('img');
        if (img && img.complete) {
          // Find the image index from the container
          const imgIndex = parseInt(container.getAttribute('data-img-index'));
          if (!isNaN(imgIndex)) {
            // Throttle scale calculations to prevent loops
            if (scaleCalculationTimeout[imgIndex]) {
              clearTimeout(scaleCalculationTimeout[imgIndex]);
            }

            const timeoutId = setTimeout(() => {
              console.log(`Container ${imgIndex} resized, recalculating scale`);
              calculateImageScale(img, imgIndex);
              setScaleCalculationTimeout(prev => ({ ...prev, [imgIndex]: null }));
            }, 150);

            setScaleCalculationTimeout(prev => ({ ...prev, [imgIndex]: timeoutId }));
          }
        }
      });
    });

    // Observe all current containers
    const observeContainers = () => {
      const containers = document.querySelectorAll('[data-img-index]');
      console.log(`Observing ${containers.length} containers for resize`);
      containers.forEach(container => {
        resizeObserver.observe(container);
      });
    };

    // Initial observation
    observeContainers();

    // Re-observe when images change
    const timeoutId = setTimeout(observeContainers, 100);

    // Return cleanup function
    return () => {
      resizeObserver.disconnect();
      clearTimeout(timeoutId);
      // Clear any pending timeouts
      Object.values(scaleCalculationTimeout).forEach(timeoutId => {
        if (timeoutId) clearTimeout(timeoutId);
      });
    };
  }, [imagesData]); // Re-run when images change

  // Separate effect to observe containers when images change
  useEffect(() => {
    const containers = document.querySelectorAll('[data-img-index]');
    console.log(`Found ${containers.length} image containers to observe`);

    // Reset image load flags when data changes
    setImageLoadFlags({});
  }, [imagesData]); // Log when images change

  // Add window resize listener as backup
  useEffect(() => {
    const handleWindowResize = () => {
      console.log('Window resized, recalculating all scales');

      // Recalculate all visible images after a short delay
      setTimeout(() => {
        const containers = document.querySelectorAll('[data-img-index]');
        containers.forEach(container => {
          const img = container.querySelector('img');
          const imgIndex = parseInt(container.getAttribute('data-img-index'));
          if (img && img.complete && !isNaN(imgIndex)) {
            calculateImageScale(img, imgIndex);
          }
        });
      }, 250);
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // Separate function for calculating scale to avoid infinite loops
  const calculateImageScale = (imgElement, imgIndex) => {
    const naturalWidth = imgElement.naturalWidth;
    const naturalHeight = imgElement.naturalHeight;
    const container = imgElement.parentElement;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    if (containerWidth === 0 || containerHeight === 0) {
      return; // Don't calculate if container has no size
    }

    // For object-fit: contain, calculate the actual displayed size
    const containerAspectRatio = containerWidth / containerHeight;
    const imageAspectRatio = naturalWidth / naturalHeight;

    let displayedWidth, displayedHeight;
    let offsetX = 0, offsetY = 0;

    if (imageAspectRatio > containerAspectRatio) {
      // Image is wider - fit to container width
      displayedWidth = containerWidth;
      displayedHeight = containerWidth / imageAspectRatio;
      offsetY = (containerHeight - displayedHeight) / 2;
    } else {
      // Image is taller - fit to container height
      displayedHeight = containerHeight;
      displayedWidth = containerHeight * imageAspectRatio;
      offsetX = (containerWidth - displayedWidth) / 2;
    }

    const scaleX = displayedWidth / naturalWidth;
    const scaleY = displayedHeight / naturalHeight;

    // Only update if the scale has actually changed
    setScales((prevScales) => {
      const existing = prevScales[imgIndex];
      if (existing &&
        Math.abs(existing.scaleX - scaleX) < 0.001 &&
        Math.abs(existing.scaleY - scaleY) < 0.001 &&
        Math.abs(existing.offsetX - offsetX) < 1 &&
        Math.abs(existing.offsetY - offsetY) < 1) {
        return prevScales; // No significant change, don't update
      }

      console.log(`🎨 Scale updated for image ${imgIndex}:`, {
        displayed: { width: displayedWidth, height: displayedHeight },
        scale: { x: scaleX, y: scaleY },
        offset: { x: offsetX, y: offsetY }
      });

      return {
        ...prevScales,
        [imgIndex]: {
          scaleX,
          scaleY,
          offsetX,
          offsetY,
          containerWidth,
          containerHeight,
          naturalWidth,
          naturalHeight,
          displayedWidth,
          displayedHeight
        },
      };
    });
  };

  const handleImageLoad = (e, imgIndex) => {
    // Prevent multiple loads for the same image
    const imageKey = `${imgIndex}-${e.target.src}`;
    if (imageLoadFlags[imageKey]) {
      console.log(`📸 Image ${imgIndex} already processed, skipping`);
      return;
    }

    console.log(`📸 Image ${imgIndex} loaded`);

    // Mark this image as processed
    setImageLoadFlags(prev => ({ ...prev, [imageKey]: true }));

    // Add a small delay to ensure the image is fully rendered
    setTimeout(() => {
      calculateImageScale(e.target, imgIndex);
    }, 100);
  };

  const handleImageError = (e, imgIndex) => {
    console.error(`Image ${imgIndex} failed to load:`, e.target.src);
    console.error('Image error details:', {
      imgIndex,
      src: e.target.src,
      srcType: e.target.src.startsWith('blob:') ? 'blob URL' :
        e.target.src.startsWith('data:') ? 'data URL' :
          e.target.src.startsWith('http') ? 'HTTP URL' : 'unknown',
      errorType: e.type,
      naturalWidth: e.target.naturalWidth,
      naturalHeight: e.target.naturalHeight
    });
  };

  const getAdjustedBox = (box, scale, imgData) => {
    if (!scale) {
      console.warn('⚠️ No scale data available for box adjustment');
      return box;
    }

    // Use original image size from API response, not the preview image natural size
    const originalWidth = imgData?.imageSize?.[0] || scale.naturalWidth;
    const originalHeight = imgData?.imageSize?.[1] || scale.naturalHeight;

    console.log('🎯 RAW BOX DATA:', {
      box: box,
      bbox: box.bbox,
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      originalImageSize: [originalWidth, originalHeight],
      previewImageSize: { width: scale.naturalWidth, height: scale.naturalHeight },
      normalized: {
        x: box.x / originalWidth,
        y: box.y / originalHeight,
        width: box.width / originalWidth,
        height: box.height / originalHeight
      }
    });

    const adjusted = {
      x: ((box.x / originalWidth) * scale.displayedWidth) + scale.offsetX,
      y: ((box.y / originalHeight) * scale.displayedHeight) + scale.offsetY,
      width: (box.width / originalWidth) * scale.displayedWidth,
      height: (box.height / originalHeight) * scale.displayedHeight,
    };

    console.log('🎨 Box adjustment:', {
      original: `(${box.x}, ${box.y}) ${box.width}×${box.height}`,
      originalImageSize: `${originalWidth}×${originalHeight}`,
      normalized: `(${(box.x / originalWidth).toFixed(3)}, ${(box.y / originalHeight).toFixed(3)}) ${(box.width / originalWidth).toFixed(3)}×${(box.height / originalHeight).toFixed(3)}`,
      displayedSize: `${scale.displayedWidth}×${scale.displayedHeight}`,
      offset: `(${scale.offsetX}, ${scale.offsetY})`,
      adjusted: `(${adjusted.x.toFixed(1)}, ${adjusted.y.toFixed(1)}) ${adjusted.width.toFixed(1)}×${adjusted.height.toFixed(1)}`
    });

    return adjusted;
  };

  const toggleBox = (imageIndex, boxId) => {
    const key = `${imageIndex}-${boxId}`;
    setSelectedBoxes((prevSelected) => {
      if (prevSelected.includes(key)) {
        return prevSelected.filter((item) => item !== key);
      } else {
        return [...prevSelected, key];
      }
    });
  };

  // Filter boxes based on current filter criteria
  const filteredBoxes = useMemo(() => {
    // Start with all boxes, including modified detections
    return imagesData.map((imgData, imgIndex) => {
      // Use modified detections if available, otherwise use original
      const currentBoundingBoxes = modifiedDetections[imgIndex] || imgData.boundingBoxes;

      // Filter boxes based on current criteria
      const filteredBoundingBoxes = currentBoundingBoxes.filter((box) => {
        // Age filter - if box has age data
        if (box.estimatedAge !== null && box.estimatedAge !== undefined) {
          if (box.estimatedAge < ageRange[0] || box.estimatedAge > ageRange[1]) {
            return false;
          }
        }

        // Confidence filter - converted to percentage for UI consistency
        if (box.confidence !== null && box.confidence !== undefined) {
          const confidencePercent = box.confidence * 100;
          if (confidencePercent < detectionScore[0] || confidencePercent > detectionScore[1]) {
            return false;
          }
        }

        return true;
      });

      return {
        ...imgData,
        boundingBoxes: filteredBoundingBoxes,
      };
    });
  }, [imagesData, ageRange, detectionScore, modifiedDetections]);

  // Calculate counts for display
  const counts = useMemo(() => {
    const totalImages = imagesData.length;
    // Include modified detections in total count
    const totalFacesDetected = imagesData.reduce((sum, imgData, imgIndex) => {
      const currentDetections = modifiedDetections[imgIndex] || imgData.boundingBoxes;
      return sum + currentDetections.length;
    }, 0);
    const facesAfterFilter = filteredBoxes.reduce((sum, imgData) => sum + imgData.boundingBoxes.length, 0);
    const selectedFacesCount = selectedBoxes.length;

    return {
      totalImages,
      totalFacesDetected,
      facesAfterFilter,
      selectedFacesCount
    };
  }, [imagesData, filteredBoxes, selectedBoxes, modifiedDetections]);

  const handleLargestOnlyChange = (e) => {
    const checked = e.target.checked;
    setLargestOnly(checked);
    if (checked) {
      const newSelections = imagesData.map((imgData, imgIndex) => {
        if (!imgData.boundingBoxes || imgData.boundingBoxes.length === 0) {
          return null;
        }
        const largestBox = imgData.boundingBoxes.reduce((maxBox, box) => {
          if (!maxBox) return box;
          return (box.width * box.height) > (maxBox.width * maxBox.height) ? box : maxBox;
        }, null);

        return largestBox ? `${imgIndex}-${largestBox.id}` : null;
      }).filter(item => item !== null);
      setSelectedBoxes(newSelections);
    } else {
      setSelectedBoxes(initialSelectedBoxes);
    }
  };

  const handleSearch = () => {
    // Collect all selected faces with their embeddings and data
    const selectedFacesData = selectedBoxes.map(key => {
      const [imgIndex, boxId] = key.split('-').map(Number);
      const imgData = imagesData[imgIndex];
      const box = imgData.boundingBoxes.find(b => b.id === boxId);

      if (!box) return null;

      return {
        probeId: imgData.probeId,
        faceData: {
          bbox: [box.x, box.y, box.x + box.width, box.y + box.height],
          embedding: box.embedding,
          age: box.estimatedAge,
          gender: box.estimatedGender,
          confidence: box.confidence,
          faceSize: box.faceSize
        }
      };
    }).filter(item => item && item.faceData.embedding);

    // Navigate to search results page with selected face data
    if (selectedFacesData.length > 0) {
      // You could navigate to results or dispatch an action to your store
      console.log('Selected faces for search:', selectedFacesData);

      // Example: Navigate to search results with the data
      // navigate('/search-results', { state: { searchData: selectedFacesData } });

      // Or dispatch to your Redux store if using Redux
      // dispatch(searchWithFaces(selectedFacesData));
    } else {
      console.warn('No faces with embeddings selected for search');
      // You could show a notification to the user here
    }
  };

  // Modal handlers for manual embedding
  const handleOpenModal = (imgIndex) => {
    const imgData = filteredBoxes[imgIndex];
    if (imgData) {
      setSelectedImageData({
        ...imgData,
        imgIndex,
        boundingBoxes: modifiedDetections[imgIndex] || imgData.boundingBoxes
      });
      setModalVisible(true);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedImageData(null);
  };

  const handleDetectionsUpdate = (updatedDetections) => {
    if (selectedImageData) {
      const imgIndex = selectedImageData.imgIndex;
      setModifiedDetections(prev => ({
        ...prev,
        [imgIndex]: updatedDetections
      }));
    }
  };

  // Get current detections for an image (modified or original)
  const getCurrentDetections = (imgIndex) => {
    return modifiedDetections[imgIndex] || filteredBoxes[imgIndex]?.boundingBoxes || [];
  };

  return (
    <>
      <CRow className="my-4">
        {/* First column for images */}
        <CCol md="4">
          {filteredBoxes
            .filter((_, imgIndex) => imgIndex % 2 === 0) // Even indexed images (0, 2, 4...)
            .map((imgData, relativeIndex) => {
              const imgIndex = relativeIndex * 2; // Convert back to original index
              return (
                <div
                  key={imgIndex}
                  data-img-index={imgIndex}
                  style={{
                    position: 'relative',
                    width: '100%',
                    paddingTop: '75%',
                    marginBottom: '20px',
                    overflow: 'hidden',
                    border: '1px solid var(--cui-border-color)',
                    backgroundColor: 'var(--cui-body-bg)'
                  }}
                >
                  <img
                    src={imgData.url}
                    alt={`Face ${imgIndex + 1}`}
                    onLoad={(e) => handleImageLoad(e, imgIndex)}
                    onError={(e) => handleImageError(e, imgIndex)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                  />
                  {getCurrentDetections(imgIndex).map((box) => {
                    const key = `${imgIndex}-${box.id}`;
                    const isSelected = selectedBoxes.includes(key);
                    const scale = scales[imgIndex];
                    if (!scale) return null; // Don't render box if scale isn't ready
                    const adjustedBox = getAdjustedBox(box, scale, imgData);
                    if (!adjustedBox) return null; // Don't render if adjustment fails

                    return (
                      <React.Fragment key={key}>
                        {/* Main bounding box */}
                        <div
                          onClick={() => toggleBox(imgIndex, box.id)}
                          style={{
                            position: 'absolute',
                            top: adjustedBox.y,
                            left: adjustedBox.x,
                            width: adjustedBox.width,
                            height: adjustedBox.height,
                            border: isSelected ? '2px solid #32CD32' : '2px dotted #32CD32',
                            cursor: 'pointer',
                            boxSizing: 'border-box',
                          }}
                        >
                          <div style={faceBadgeStyle}>
                            {box.estimatedAge && (
                              <CTooltip content="Estimated Age">
                                <CBadge color="info">Age: {box.estimatedAge}</CBadge>
                              </CTooltip>
                            )}
                            {box.estimatedGender !== null && box.estimatedGender !== undefined && (
                              <CTooltip content="Gender">
                                <CBadge color="secondary">{GENDER_LABELS[box.estimatedGender]}</CBadge>
                              </CTooltip>
                            )}
                            {box.confidence && (
                              <CTooltip content="Confidence Score">
                                <CBadge color={box.confidence > 0.85 ? "success" : "warning"}>
                                  {formatConfidence(box.confidence)}
                                </CBadge>
                              </CTooltip>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}

                  {/* Face count overlay */}
                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    zIndex: 101
                  }}>
                    {getCurrentDetections(imgIndex).length} face{getCurrentDetections(imgIndex).length !== 1 ? 's' : ''}
                  </div>

                  {/* Edit button */}
                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '8px',
                    zIndex: 102
                  }}>
                    <CTooltip content="Add manual face detections">
                      <CButton
                        color="primary"
                        size="sm"
                        onClick={() => handleOpenModal(imgIndex)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '0.7rem',
                          borderRadius: '4px'
                        }}
                      >
                        <CIcon icon={cilPencil} className="me-1" size="sm" />
                        Edit
                      </CButton>
                    </CTooltip>
                  </div>
                </div>
              );
            })}
        </CCol>

        {/* Second column for images */}
        <CCol md="4">
          {filteredBoxes
            .filter((_, imgIndex) => imgIndex % 2 === 1) // Odd indexed images (1, 3, 5...)
            .map((imgData, relativeIndex) => {
              const imgIndex = relativeIndex * 2 + 1; // Convert back to original index
              return (
                <div
                  key={imgIndex}
                  data-img-index={imgIndex}
                  style={{
                    position: 'relative',
                    width: '100%',
                    paddingTop: '75%',
                    marginBottom: '20px',
                    overflow: 'hidden',
                    border: '1px solid var(--cui-border-color)',
                    backgroundColor: 'var(--cui-body-bg)'
                  }}
                >
                  <img
                    src={imgData.url}
                    alt={`Face ${imgIndex + 1}`}
                    onLoad={(e) => handleImageLoad(e, imgIndex)}
                    onError={(e) => handleImageError(e, imgIndex)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                  />
                  {getCurrentDetections(imgIndex).map((box) => {
                    const key = `${imgIndex}-${box.id}`;
                    const isSelected = selectedBoxes.includes(key);
                    const scale = scales[imgIndex];
                    if (!scale) return null; // Don't render box if scale isn't ready
                    const adjustedBox = getAdjustedBox(box, scale, imgData);
                    if (!adjustedBox) return null; // Don't render if adjustment fails

                    return (
                      <React.Fragment key={key}>
                        {/* Main bounding box */}
                        <div
                          onClick={() => toggleBox(imgIndex, box.id)}
                          style={{
                            position: 'absolute',
                            top: adjustedBox.y,
                            left: adjustedBox.x,
                            width: adjustedBox.width,
                            height: adjustedBox.height,
                            border: isSelected ? '2px solid #32CD32' : '2px dotted #32CD32',
                            cursor: 'pointer',
                            boxSizing: 'border-box',
                          }}
                        >
                          <div style={faceBadgeStyle}>
                            {box.estimatedAge && (
                              <CTooltip content="Estimated Age">
                                <CBadge color="info">Age: {box.estimatedAge}</CBadge>
                              </CTooltip>
                            )}
                            {box.estimatedGender !== null && box.estimatedGender !== undefined && (
                              <CTooltip content="Gender">
                                <CBadge color="secondary">{GENDER_LABELS[box.estimatedGender]}</CBadge>
                              </CTooltip>
                            )}
                            {box.confidence && (
                              <CTooltip content="Confidence Score">
                                <CBadge color={box.confidence > 0.85 ? "success" : "warning"}>
                                  {formatConfidence(box.confidence)}
                                </CBadge>
                              </CTooltip>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}

                  {/* Face count overlay */}
                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    zIndex: 101
                  }}>
                    {getCurrentDetections(imgIndex).length} face{getCurrentDetections(imgIndex).length !== 1 ? 's' : ''}
                  </div>

                  {/* Edit button */}
                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '8px',
                    zIndex: 102
                  }}>
                    <CTooltip content="Add manual face detections">
                      <CButton
                        color="primary"
                        size="sm"
                        onClick={() => handleOpenModal(imgIndex)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '0.7rem',
                          borderRadius: '4px'
                        }}
                      >
                        <CIcon icon={cilPencil} className="me-1" size="sm" />
                        Edit
                      </CButton>
                    </CTooltip>
                  </div>
                </div>
              );
            })}
        </CCol>

        {/* Third column for filters - sticky */}
        <CCol md="4">
          <div style={{ position: 'sticky', top: '145px', height: 'fit-content' }}>
            {/* Counts section */}
            <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid var(--cui-border-color)', borderRadius: '4px', backgroundColor: 'var(--cui-card-bg)', color: 'var(--cui-body-color)' }}>
              <h6 style={{ marginBottom: '10px', color: 'var(--cui-body-color)' }}>Face Detection Summary</h6>
              <div style={{ fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--cui-body-color)' }}>
                <div><strong>Images:</strong> {counts.totalImages}</div>
                <div><strong>Faces Detected:</strong> {counts.totalFacesDetected}</div>
                <div><strong>Faces After Filter:</strong> {counts.facesAfterFilter}</div>
                <div><strong>Faces Selected:</strong> {counts.selectedFacesCount}</div>
              </div>
            </div>

            <div style={{ marginBottom: '10px', padding: '20px', border: '1px solid var(--cui-border-color)', borderRadius: '4px', backgroundColor: 'var(--cui-card-bg)', color: 'var(--cui-body-color)' }}>
              <h5>Filters</h5>
              <CFormCheck
                id="largest-only"
                label="Largest face only"
                checked={largestOnly}
                onChange={handleLargestOnlyChange}
                style={checkboxStyle}
              />
              <CFormLabel htmlFor="age-range">Age Range</CFormLabel>
              <RangeSlider
                className="custom-range-slider"
                id="age-range"
                min={0}
                max={120}
                value={ageRange}
                onInput={setAgeRange}
                ariaLabel={['Min age', 'Max age']}
                ariaLabelledBy={['Min age', 'Max age']}
                step={1}
                style={sliderStyle}
              />
              <div style={rangeStyle}>
                {ageRange[0]} - {ageRange[1]}
              </div>
              <CFormLabel htmlFor="name-score">Name Score</CFormLabel>
              <RangeSlider
                className="custom-range-slider"
                id="name-score"
                min={0}
                max={100}
                value={nameScore}
                onInput={setNameScore}
                ariaLabel={['Min name score', 'Max name score']}
                ariaLabelledBy={['Min name score', 'Max name score']}
                step={1}
                style={sliderStyle}
              />
              <div style={rangeStyle}>
                {nameScore[0]} - {nameScore[1]}
              </div>
              <CFormLabel htmlFor="detection-score">Detection Score</CFormLabel>
              <RangeSlider
                className="custom-range-slider"
                id="detection-score"
                min={0}
                max={100}
                value={detectionScore}
                onInput={setDetectionScore}
                ariaLabel={['Min detection score', 'Max detection score']}
                ariaLabelledBy={['Min detection score', 'Max detection score']}
                step={1}
                style={sliderStyle}
              />
              <div style={rangeStyle}>
                {detectionScore[0]} - {detectionScore[1]}
              </div>
              <div style={buttonStyle}>
                <CButton color="primary" onClick={handleSearch}>
                  Submit Search
                </CButton>
              </div>
            </div>
          </div>
        </CCol>
      </CRow>

      {/* Manual Embedding Modal */}
      <ManualEmbeddingModal
        visible={modalVisible}
        onClose={handleCloseModal}
        imageData={selectedImageData}
        existingDetections={selectedImageData ? getCurrentDetections(selectedImageData.imgIndex) : []}
        onDetectionsUpdate={handleDetectionsUpdate}
      />
    </>
  );
};

export default Detections;
