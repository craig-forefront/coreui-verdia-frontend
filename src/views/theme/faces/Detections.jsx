import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CRow, CCol, CButton, CFormCheck, CFormLabel, CBadge, CTooltip } from '@coreui/react';
import RangeSlider from 'react-range-slider-input';
import 'react-range-slider-input/dist/style.css';
import './detections.css';

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
  left: '0',
  padding: '2px 6px',
  fontSize: '0.7rem',
  zIndex: 100,
  display: 'flex',
  gap: '5px'
};


const Detections = () => {
  // Simple direct console log that should appear immediately when component renders
  console.log('======= DETECTIONS COMPONENT MOUNTED =======');
  
  const location = useLocation();
  // Get API response from location state
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
          probeId: result.probe_id,
          imageSize: result.image_size,
          numFaces: result?.faces?.length || 0,
          imagePreviewUrl: result.imagePreviewUrl ? 'Present' : 'Missing',
          originalFilename: result.originalFilename || 'Not available'
        });
      });
    } else if (apiResponse) {
      console.log('API Response is not an array but an object:', {
        probeId: apiResponse.probe_id,
        imageSize: apiResponse.image_size,
        numFaces: apiResponse?.faces?.length || 0,
      });
    } else {
      console.log('No API Response data found in location state');
    }
  }, [location, apiResponse]);
  
  // Process the API response to match the expected format
  const processedData = useMemo(() => {
    // Add debug logging for the processing stage
    console.log('Processing API response data');
    
    if (!apiResponse || !Array.isArray(apiResponse)) {
      console.log('No valid API response data to process');
      return [];
    }
    
    console.log('Converting API response array to processedData format');
    // Format the API data into the format expected by the component
    // apiResponse is an array of detection results from multiple images
    return apiResponse.map((result, index) => {
      console.log(`Processing result ${index + 1}:`, {
        hasImagePreview: !!result.imagePreviewUrl,
        faceCount: result.faces?.length || 0,
        originalFilename: result.originalFilename || 'Not available',
        urlType: result.imagePreviewUrl ? 
          (result.imagePreviewUrl.startsWith('blob:') ? 'blob URL' :
           result.imagePreviewUrl.startsWith('data:') ? 'data URL' : 'other') : 'none',
        urlLength: result.imagePreviewUrl ? result.imagePreviewUrl.length : 0
      });
      
      const processedResult = {
        url: result.imagePreviewUrl || null,
        probeId: result.probe_id,
        imageSize: result.image_size,
        boundingBoxes: result.faces?.map((face, idx) => {
          // API returns bbox as [x1, y1, x2, y2], convert to {x, y, width, height}
          const [x1, y1, x2, y2] = face.bbox;
          return {
            id: idx + 1,
            x: x1,
            y: y1,
            width: x2 - x1,
            height: y2 - y1,
            // Include additional face data
            estimatedAge: face.estimated_age,
            estimatedGender: face.estimated_gender,
            confidence: face.confidence,
            faceSize: face.face_size,
            // Optional: Include embedding if needed for search
            embedding: face.embedding
          };
        }) || []
      };
      console.log(`Processed result ${index + 1}:`, {
        url: processedResult.url ? 'Present' : 'Missing',
        boundingBoxCount: processedResult.boundingBoxes.length
      });
      return processedResult;
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

  const handleImageLoad = (e, imgIndex) => {
    console.log(`Image ${imgIndex} loaded successfully:`, e.target.src);
    const naturalWidth = e.target.naturalWidth;
    const naturalHeight = e.target.naturalHeight;
    const container = e.target.parentElement;
    const containerWidth = container.offsetWidth;
    const containerHeight = containerWidth * 0.75;
    setScales((prevScales) => ({
      ...prevScales,
      [imgIndex]: { scaleX: containerWidth / naturalWidth, scaleY: containerHeight / naturalHeight },
    }));
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

  const getAdjustedBox = (box, scale) => {
    if (!scale) return box;
    return {
      x: box.x * scale.scaleX,
      y: box.y * scale.scaleY,
      width: box.width * scale.scaleX,
      height: box.height * scale.scaleY,
    };
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
    // Start with all boxes
    return imagesData.map((imgData, imgIndex) => {
      // Filter boxes based on current criteria
      const filteredBoundingBoxes = imgData.boundingBoxes.filter((box) => {
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
  }, [imagesData, ageRange, detectionScore]);

  const handleLargestOnlyChange = (e) => {
    const checked = e.target.checked;
    setLargestOnly(checked);
    if (checked) {
      const newSelections = imagesData.map((imgData, imgIndex) => {
        const largestBox = imgData.boundingBoxes.reduce((maxBox, box) => {
          return (box.width * box.height) > (maxBox.width * maxBox.height) ? box : maxBox;
        }, imgData.boundingBoxes[0]);
        return `${imgIndex}-${largestBox.id}`;
      });
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
    }).filter(item => item.faceData.embedding);

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

  return (
    <>
      <CRow className="my-4">
        {/* First column for images */}
        <CCol md="4">
          {console.log('First column images:', filteredBoxes.filter((_, imgIndex) => imgIndex % 2 === 0).map(img => img.url))}
          {filteredBoxes
            .filter((_, imgIndex) => imgIndex % 2 === 0) // Even indexed images (0, 2, 4...)
            .map((imgData, relativeIndex) => {
              const imgIndex = relativeIndex * 2; // Convert back to original index
              console.log(`Rendering image ${imgIndex} with URL:`, imgData.url);
              return (
                <div
                  key={imgIndex}
                  style={{
                    position: 'relative',
                    width: '100%',
                    paddingTop: '75%',
                    marginBottom: '20px',
                    overflow: 'hidden',
                    border: '1px solid #ddd', // Add border to see the container
                    backgroundColor: '#f8f9fa' // Add background to see if container is rendering
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
                      objectFit: 'cover',
                    }}
                  />
                  {imgData.boundingBoxes.map((box) => {
                    const key = `${imgIndex}-${box.id}`;
                    const isSelected = selectedBoxes.includes(key);
                    const scale = scales[imgIndex];
                    const adjustedBox = getAdjustedBox(box, scale);
                    return (
                      <div
                        key={key}
                        onClick={() => toggleBox(imgIndex, box.id)}
                        style={{
                          position: 'absolute',
                          top: adjustedBox.y,
                          left: adjustedBox.x,
                          width: adjustedBox.width,
                          height: adjustedBox.height,
                          border: isSelected ? '2px solid #007bff' : '2px dotted red',
                          cursor: 'pointer',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div style={faceBadgeStyle}>
                          {box.estimatedAge && (
                            <CTooltip content="Estimated Age">
                              <CBadge color="info">{box.estimatedAge}</CBadge>
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
                    );
                  })}
                </div>
              );
            })}
        </CCol>
        
        {/* Second column for images */}
        <CCol md="4">
          {console.log('Second column images:', filteredBoxes.filter((_, imgIndex) => imgIndex % 2 === 1).map(img => img.url))}
          {filteredBoxes
            .filter((_, imgIndex) => imgIndex % 2 === 1) // Odd indexed images (1, 3, 5...)
            .map((imgData, relativeIndex) => {
              const imgIndex = relativeIndex * 2 + 1; // Convert back to original index
              console.log(`Rendering image ${imgIndex} with URL:`, imgData.url);
              return (
                <div
                  key={imgIndex}
                  style={{
                    position: 'relative',
                    width: '100%',
                    paddingTop: '75%',
                    marginBottom: '20px',
                    overflow: 'hidden',
                    border: '1px solid #ddd', // Add border to see the container
                    backgroundColor: '#f8f9fa' // Add background to see if container is rendering
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
                      objectFit: 'cover',
                    }}
                  />
                  {imgData.boundingBoxes.map((box) => {
                    const key = `${imgIndex}-${box.id}`;
                    const isSelected = selectedBoxes.includes(key);
                    const scale = scales[imgIndex];
                    const adjustedBox = getAdjustedBox(box, scale);
                    return (
                      <div
                        key={key}
                        onClick={() => toggleBox(imgIndex, box.id)}
                        style={{
                          position: 'absolute',
                          top: adjustedBox.y,
                          left: adjustedBox.x,
                          width: adjustedBox.width,
                          height: adjustedBox.height,
                          border: isSelected ? '2px solid #007bff' : '2px dotted red',
                          cursor: 'pointer',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div style={faceBadgeStyle}>
                          {box.estimatedAge && (
                            <CTooltip content="Estimated Age">
                              <CBadge color="info">{box.estimatedAge}</CBadge>
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
                    );
                  })}
                </div>
              );
            })}
        </CCol>
        
        {/* Third column for filters - keep as is */}
        <CCol md="4">
          <div style={{ marginBottom: '10px', padding: '20px', border: '1px solid #ddd', borderRadius: '4px' }}>
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
        </CCol>
      </CRow>

      {/* Debug section to show image URLs */}
      <CRow className="mt-4">
        <CCol>
          <details>
            <summary>Debug Info (click to expand)</summary>
            <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <h6>Image URLs:</h6>
              <ul>
                {filteredBoxes.map((imgData, i) => (
                  <li key={i}>
                    Image {i}: {imgData.url ? imgData.url : 'No URL available'}
                  </li>
                ))}
              </ul>
              <h6>Data Processing:</h6>
              <pre>{JSON.stringify({ 
                totalImages: imagesData.length,
                filteredImages: filteredBoxes.length,
                hasApiResponse: !!apiResponse,
                responseLength: apiResponse?.length
              }, null, 2)}</pre>
            </div>
          </details>
        </CCol>
      </CRow>
    </>
  );
};

export default Detections;