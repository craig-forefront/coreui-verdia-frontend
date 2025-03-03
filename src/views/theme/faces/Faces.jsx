import React, { useState, useEffect, lazy, Suspense } from 'react'
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardHeader,
  CCardBody,
  CCardText,
  CCardImage,
  CButton,
} from '@coreui/react'
import image1 from '../../../assets/face1.jpeg'
import image2 from '../../../assets/face2.jpeg'
import image3 from '../../../assets/face3.jpeg'
import CandidateModal from '../../../components/CandidateModal' // Import the new component

// Utility to choose border color based on match score
const getBorderClass = (score) => {
  if (score >= 90) return 'border-success'
  if (score >= 70) return 'border-info'
  return 'border-danger' // Ensure you have defined a purple border in your CSS if needed.
}

const getTextColorClass = (score) => {
  if (score >= 90) return 'text-success'
  if (score >= 70) return 'text-info'
  return 'text-danger' // Ensure you have defined a purple text color in your CSS if needed.
}

// Stub component rendering a row of candidate result cards using CoreUI components
const ResultsRow = ({ results, probeImage, selectedIndex, setSelectedIndex, setModalVisible }) => {

  const handleCandidateClick = (index) => {
    setSelectedIndex(index)
    setModalVisible(true)
  }

  return (
    // Keep all cards in one row with horizontal scrolling if needed.
    <CRow className="mt-2 flex-nowrap" style={{ overflowX: 'auto'}}>
      {results.map((candidate, idx) => (
        <CCol key={idx} xs={4} sm={2} className="mb-2">
          <CCard style={{ borderWidth: '2px' }} className={`h-100 ${getBorderClass(candidate.score)}`}>
            <CCardHeader
              className={`p-0 font-weight-bold text-top text-center ${getTextColorClass(candidate.score)}`}
            >
              <strong>{candidate.score}</strong>
            </CCardHeader>
            <CCardImage
              orientation="top"
              src={candidate.image}
              style={{ padding: '8px', paddingBottom: '0', height: '120px', objectFit: 'cover', width: '100%' }}
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
                <CButton color="primary" size="sm" onClick={() => handleCandidateClick(idx)}>
                  View Profile
                </CButton>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      ))}
      
    </CRow>
  )
}

// Lazy load ResultsRow with a simulated network delay
const LazyResultsRow = lazy(
  () =>
    new Promise((resolve) =>
      setTimeout(() => resolve({ default: ResultsRow }), 500)
    )
)

const Faces = () => {
  const [probes, setProbes] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    // Using imported images as candidate sources.
    const images = [image1, image2, image3]
    // For each probe, create results as an array of candidate objects.
    setProbes([
      {
        probe: image1,
        results: new Array(20).fill(null).map((_, idx) => {
          const score = Math.max(100 - idx * 5, 50) // First candidate highest, descending order
          return {
            image: images[idx % images.length],
            score,
            name: `Candidate Name is much longer to  ${idx + 1}`,
            dob: '1990-01-01',
            sex: idx % 2 === 0 ? 'M' : 'F',
          }
        }),
      },
      {
        probe: image2,
        results: new Array(15).fill(null).map((_, idx) => {
          const score = Math.max(100 - idx * 4, 50)
          return {
            image: images[idx % images.length],
            score,
            name: `Candidate ${idx + 1}`,
            dob: '1985-05-15',
            sex: idx % 2 === 0 ? 'M' : 'F',
          }
        }),
      },
      {
        probe: image3,
        results: new Array(10).fill(null).map((_, idx) => {
          const score = Math.max(100 - idx * 6, 50)
          return {
            image: images[idx % images.length],
            score,
            name: `Candidate ${idx + 1}`,
            dob: '1992-10-20',
            sex: idx % 2 === 0 ? 'M' : 'F',
          }
        }),
      },
    ])
  }, [])

  return (
    <CContainer className="py-4">
      {probes.map((item, index) => (
        <CRow key={index} className="mb-4">
          <CCol xs={2}>
            <CCard className="h-100">
              <CCardHeader className="text-center">
                <strong>Probe</strong>
              </CCardHeader>
              <CCardImage
                orientation="top"
                src={item.probe}
                style={{ padding: '8px', height: '120px', objectFit: 'cover', width: '100%' }}
              />
              <CCardText className="text-center text-middle">Candidate ID</CCardText>
            </CCard>
          </CCol>
          <CCol xs={10}>
            <Suspense fallback={<div>Loading results...</div>}>
              <LazyResultsRow
                results={item.results}
                probeImage={item.probe}
                selectedIndex={selectedIndex}
                setSelectedIndex={setSelectedIndex}
                setModalVisible={setModalVisible}
              />
            </Suspense>
          </CCol>
        </CRow>
      ))}
      <CandidateModal
        visible={modalVisible}
        setVisible={setModalVisible}
        probeImage={probes[0]?.probe}
        candidate={probes[0]?.results[selectedIndex]}
        onPrev={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
        onNext={() => setSelectedIndex(Math.min(probes[0]?.results.length - 1, selectedIndex + 1))}
        showPrev={selectedIndex > 0}
        showNext={selectedIndex < probes[0]?.results.length - 1}
      />
    </CContainer>
  )
}

export default Faces