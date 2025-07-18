import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CCardText,
  CCardImage,
  CButton,
  CPlaceholder
} from '@coreui/react'

// Utility to choose border color based on match score
export const getBorderClass = (score) => {
  if (score >= 90) return 'border-success'
  if (score >= 70) return 'border-info'
  return 'border-danger'
}

export const getTextColorClass = (score) => {
  if (score >= 90) return 'text-success'
  if (score >= 70) return 'text-info'
  return 'text-danger'
}

const CandidateCard = React.memo(({ candidate, onClick }) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  
  // Use effect to preload image
  useEffect(() => {
    if (!candidate?.image) return;
    
    const img = new Image();
    img.src = candidate.image;
    
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageLoaded(true);
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [candidate]);
  
  if (!candidate) return null;
  
  return (
    <CCard style={{ borderWidth: '2px', height: '100%' }} className={`${getBorderClass(candidate.score)}`}>
      <CCardHeader
        className={`p-0 font-weight-bold text-top text-center ${getTextColorClass(candidate.score)}`}
      >
        <strong>{candidate.score}</strong>
      </CCardHeader>
      
      {!imageLoaded ? (
        <div style={{ height: '120px', padding: '8px', paddingBottom: '0' }}>
          <CPlaceholder component="div" animation="glow" className="w-100 h-100">
            <CPlaceholder xs={12} style={{ height: '100%' }} />
          </CPlaceholder>
        </div>
      ) : (
        <div style={{ padding: '8px', paddingBottom: '0', height: '120px' }}>
          <img
            src={candidate.image}
            alt="Candidate"
            style={{
              height: '100%',
              width: '100%',
              objectFit: 'cover'
            }}
          />
        </div>
      )}
      
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
          <CButton color="primary" size="sm" onClick={onClick}>
            Compare
          </CButton>
        </div>
      </CCardBody>
    </CCard>
  )
});

export default CandidateCard;