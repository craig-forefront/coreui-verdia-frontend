import React, { useState } from 'react';
import { CRow, CCol, CButton, CFormCheck, CFormLabel } from '@coreui/react';
import RangeSlider from 'react-range-slider-input';
import 'react-range-slider-input/dist/style.css';
import image1 from '../../../assets/face1.jpeg';
import image2 from '../../../assets/face2.jpeg';
import image3 from '../../../assets/face3.jpeg';
import './detections.css';

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

const Detections = () => {
  const imagesData = [
    {
      url: image1,
      boundingBoxes: [
        { id: 1, x: 50, y: 30, width: 100, height: 150 },
        { id: 2, x: 200, y: 60, width: 80, height: 120 },
      ],
    },
    {
      url: image2,
      boundingBoxes: [
        { id: 1, x: 50, y: 30, width: 100, height: 150 },
        { id: 2, x: 200, y: 60, width: 80, height: 120 },
      ],
    },
    {
      url: image3,
      boundingBoxes: [
        { id: 1, x: 50, y: 30, width: 100, height: 150 },
        { id: 2, x: 200, y: 60, width: 80, height: 120 },
      ],
    },
  ];

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
    console.log('Selected Boxes:', selectedBoxes);
    console.log('Age Range:', ageRange);
    console.log('Name Score:', nameScore);
    console.log('Detection Score:', detectionScore);
  };

  return (
    <>
      <CRow className="my-4">
        <CCol md="9">
          <CRow>
            {imagesData.map((imgData, imgIndex) => (
              <CCol md="6" key={imgIndex}>
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    paddingTop: '75%',
                    marginBottom: '20px',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={imgData.url}
                    alt={`Face ${imgIndex + 1}`}
                    onLoad={(e) => handleImageLoad(e, imgIndex)}
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
                      />
                    );
                  })}
                </div>
              </CCol>
            ))}
          </CRow>
        </CCol>
        <CCol md="3">
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
    </>
  );
};

export default Detections;