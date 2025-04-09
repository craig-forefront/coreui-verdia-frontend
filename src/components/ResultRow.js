import React, { useState, useEffect, useRef, useCallback } from 'react'
import { FixedSizeList as List } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import CandidateCardComponent from './CandidateCard'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CCardText,
  CCardImage,
  CButton,
} from '@coreui/react'

// Score style utilities
const getBorderClass = (score) => {
  if (score >= 90) return 'border-success'
  if (score >= 70) return 'border-info'
  return 'border-danger'
}

const getTextColorClass = (score) => {
  if (score >= 90) return 'text-success'
  if (score >= 70) return 'text-info'
  return 'text-danger'
}

// Stub component rendering a row of candidate result cards using CoreUI components with virtualization
const ResultsRow = ({ results, probeImage, probeIndex, selectedIndex, setSelectedIndex, setModalVisible, setActiveProbeIndex }) => {
  const [containerWidth, setContainerWidth] = useState(0)
  const rowRef = useRef(null)

  useEffect(() => {
    if (rowRef.current) {
      setContainerWidth(rowRef.current.offsetWidth)
    }
    
    const handleResize = () => {
      if (rowRef.current) {
        setContainerWidth(rowRef.current.offsetWidth)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Add this effect to preload images when results are available
  useEffect(() => {
    if (!results || results.length === 0) return;
    
    // Preload first few images (limit to prevent too many simultaneous requests)
    const imagesToPreload = results.slice(0, 5);
    
    imagesToPreload.forEach(result => {
      if (result.image) {
        const img = new Image();
        img.src = result.image;
      }
    });
  }, [results]);

  const handleCandidateClick = useCallback((index) => {
    setSelectedIndex(index)
    setActiveProbeIndex(probeIndex)
    setModalVisible(true)
  }, [probeIndex, setSelectedIndex, setActiveProbeIndex, setModalVisible])

  // Each card's width including margins
  const cardWidth = 180 // Adjust based on your actual card width + margins
  
  // Individual candidate card renderer
  const CandidateCardRenderer = useCallback(({ index, style }) => {
    const candidate = results[index]
    if (!candidate) return null;
    
    return (
      <div style={{ ...style, padding: '0 8px' }}>
        {/* Use CandidateCardComponent or inline the card if you don't have the component */}
        {CandidateCardComponent ? (
          <CandidateCardComponent
            candidate={candidate} 
            onClick={() => handleCandidateClick(index)}
          />
        ) : (
          <CCard style={{ borderWidth: '2px', height: '100%' }} className={`${getBorderClass(candidate.score)}`}>
            <CCardHeader
              className={`p-0 font-weight-bold text-top text-center ${getTextColorClass(candidate.score)}`}
            >
              <strong>{candidate.score}</strong>
            </CCardHeader>
            <CCardImage
              orientation="top"
              src={candidate.image}
              style={{
                padding: '8px',
                paddingBottom: '0',
                height: '120px',
                objectFit: 'cover',
                width: '100%',
              }}
              loading="lazy"
            />
            <CCardBody className="d-flex flex-column">
              <CCardText
                className="mb-0 small"
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
                title={candidate.name}
              >
                {candidate.name}
              </CCardText>
              <CCardText className="mb-0 small">
                <strong>DOB:</strong> {candidate.dob}
              </CCardText>
              <CCardText className="mb-0 small">
                <strong>Sex:</strong> {candidate.sex}
              </CCardText>
              <div className="text-center mt-auto pt-2">
                <CButton color="primary" size="sm" onClick={() => handleCandidateClick(index)}>
                  Compare
                </CButton>
              </div>
            </CCardBody>
          </CCard>
        )}
      </div>
    )
  }, [results, handleCandidateClick])

  return (
    <div ref={rowRef} className="mt-2" style={{ width: '100%', height: 280 }}>
      {containerWidth > 0 && results && results.length > 0 ? (
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              itemCount={results.length}
              itemSize={cardWidth}
              layout="horizontal"
              width={width}
              overscanCount={3}
            >
              {CandidateCardRenderer}
            </List>
          )}
        </AutoSizer>
      ) : (
        <div className="text-center p-3">No results to display</div>
      )}
    </div>
  )
}

export default ResultsRow;