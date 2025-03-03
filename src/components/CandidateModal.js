import React, { useState, useRef, useEffect } from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CRow,
  CCol,
} from '@coreui/react'
import { Rnd } from 'react-rnd'

const CandidateModal = ({
  visible,
  setVisible,
  probeImage,
  candidate,
  onPrev,
  onNext,
  showPrev,
  showNext,
}) => {
  if (!candidate) return null

  const initialProbePosition = { x: 100, y: 50 }
  const initialCandidatePosition = { x: 100, y: 50 }
  const initialProbeSize = { width: 200, height: 200 }
  const initialCandidateSize = { width: 200, height: 200 }

  const [activeImage, setActiveImage] = useState(null)
  const [probePosition, setProbePosition] = useState(initialProbePosition)
  const [candidatePosition, setCandidatePosition] = useState(initialCandidatePosition)
  const [probeSize, setProbeSize] = useState(initialProbeSize)
  const [candidateSize, setCandidateSize] = useState(initialCandidateSize)

  const imageStyle = {
    width: '100%',
    height: '100%', // Make the image fill the Rnd container
    objectFit: 'contain', // Maintain aspect ratio
  }

  const rndStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid transparent',
    boxSizing: 'border-box',
    cursor: 'grab',
  }

  const resizeHandleStyles = {
    topLeft: { width: '10px', height: '10px', borderRadius: '50%', background: 'blue', top: '-5px', left: '-5px' },
    top: { width: '10px', height: '10px', borderRadius: '50%', background: 'blue', top: '-5px', left: '50%', transform: 'translateX(-50%)' },
    topRight: { width: '10px', height: '10px', borderRadius: '50%', background: 'blue', top: '-5px', right: '-5px' },
    right: { width: '10px', height: '10px', borderRadius: '50%', background: 'blue', right: '-5px', top: '50%', transform: 'translateY(-50%)' },
    bottomRight: { width: '10px', height: '10px', borderRadius: '50%', background: 'blue', bottom: '-5px', right: '-5px' },
    bottom: { width: '10px', height: '10px', borderRadius: '50%', background: 'blue', bottom: '-5px', left: '50%', transform: 'translateX(-50%)' },
    bottomLeft: { width: '10px', height: '10px', borderRadius: '50%', background: 'blue', bottom: '-5px', left: '-5px' },
    left: { width: '10px', height: '10px', borderRadius: '50%', background: 'blue', left: '-5px', top: '50%', transform: 'translateY(-50%)' },
  }

  const columnStyle = {
    textAlign: 'center',
    minHeight: '300px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center', // Center content vertically
    position: 'relative',
    zIndex: 1,
  }

  const dividerStyle = {
    padding: 0,
    display: 'flex',
    alignItems: 'stretch',
    zIndex: 2,
  }

  const modalRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setActiveImage(null)
      }
    }

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [visible, setActiveImage])

  const handleModalBodyClick = (event) => {
    if (event.target.tagName !== 'IMG') {
      setActiveImage(null)
    }
  }

  return (
    <CModal color="light" size="xl" visible={visible} onClose={() => setVisible(false)} ref={modalRef}>
      <CModalHeader className="d-flex justify-content-center">
        <CModalTitle>Face Comparison</CModalTitle>
      </CModalHeader>
      <CModalBody style={{ position: 'relative' }} onClick={handleModalBodyClick}>
        <CRow className="g-0">
          {/* Left Section (Probe) */}
          <CCol md={6} className="left-section" style={columnStyle}>
            <div style={{ marginBottom: '10px', textAlign: 'center' }}>
              <h6>Probe Image</h6>
            </div>
            <div
              style={{
                width: '100%',
                height: '300px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Rnd
                style={{
                  ...rndStyle,
                  border: activeImage === 'probe' ? '2px dashed blue' : '1px solid transparent'
                }}
                position={probePosition}
                size={probeSize}
                enableResizing={activeImage === 'probe'}
                resizeHandleStyles={resizeHandleStyles}
                onDragStart={() => setActiveImage('probe')}
                onDragStop={(e, d) => setProbePosition({ x: d.x, y: d.y })}
                onResizeStop={(e, direction, ref, delta, position) => {
                  setProbeSize({ width: ref.offsetWidth, height: ref.offsetHeight })
                  setProbePosition(position)
                }}
              >
                <img src={probeImage} style={imageStyle} alt="Probe" draggable={false} />
              </Rnd>
            </div>
          </CCol>

          {/* Right Section (Candidate) */}
          <CCol md={6} className="right-section" style={columnStyle}>
            <div style={{ marginBottom: '10px', textAlign: 'center' }}>
              <h6>Selected Candidate</h6>
            </div>
            <div
              style={{
                width: '100%',
                height: '300px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Rnd
                style={{
                  ...rndStyle,
                  border: activeImage === 'candidate' ? '2px dashed blue' : '1px solid transparent'
                }}
                position={candidatePosition}
                size={candidateSize}
                enableResizing={activeImage === 'candidate'}
                resizeHandleStyles={resizeHandleStyles}
                onDragStart={() => setActiveImage('candidate')}
                onDragStop={(e, d) => setCandidatePosition({ x: d.x, y: d.y })}
                onResizeStop={(e, direction, ref, delta, position) => {
                  setCandidateSize({ width: ref.offsetWidth, height: ref.offsetHeight })
                  setCandidatePosition(position)
                }}
              >
                <img src={candidate.image} style={imageStyle} alt="Candidate" draggable={false} />
              </Rnd>
            </div>
          </CCol>
        </CRow>
        
        {/* Absolute vertical divider positioned in the center */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: '50%',
            transform: 'translateX(-1px)',
            width: '2px',
            backgroundColor: '#ccc',
          }}
        />
      </CModalBody>
      <CModalFooter className="d-flex">
        <div className="d-flex justify-content-center flex-grow-1">
          <CButton color="primary" className="mx-2" style={{ minWidth: '120px' }} onClick={onPrev} disabled={!showPrev}>
            Previous
          </CButton>
          <CButton color="primary" className="mx-2" style={{ minWidth: '120px' }} onClick={onNext} disabled={!showNext}>
            Next
          </CButton>
        </div>
        <CButton color="secondary" onClick={() => setVisible(false)}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default CandidateModal