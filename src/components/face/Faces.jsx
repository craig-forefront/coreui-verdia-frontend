import React, { useState, useEffect, lazy, Suspense, useCallback, useMemo, useRef } from 'react'
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardHeader,
  CCardText,
  CSpinner,
  CPlaceholder,
  CButton
} from '@coreui/react'
import image1 from '../../../assets/face1.jpeg'
import image2 from '../../../assets/face2.jpeg'
import image3 from '../../../assets/face3.jpeg'
import CandidateModal from '../ui/CandidateModal'
import ProbeCard from '../ui/ProbeCard'


// Use dynamic import instead of custom timeout promise
const ResultsRow = lazy(() => import('../ui/ResultRow'))

const Faces = () => {
  const [probes, setProbes] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [activeProbeIndex, setActiveProbeIndex] = useState(0)
  const [modalVisible, setModalVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [visibleProbes, setVisibleProbes] = useState([])
  const [hasMore, setHasMore] = useState(true)
  const probesPerPage = 5
  const observerTarget = useRef(null)

  // Generate mock data - optimize by reducing amount of initial data
  const generateMockData = useCallback(() => {
    const images = [image1, image2, image3]

    return [
      {
        probe: image1,
        results: new Array(15).fill(null).map((_, idx) => ({
          image: images[idx % images.length],
          score: Math.max(100 - idx * 5, 50),
          name: `Candidate Name is much longer to ${idx + 1}`,
          dob: '1990-01-01',
          sex: idx % 2 === 0 ? 'M' : 'F',
        })),
      },
      {
        probe: image2,
        results: new Array(8).fill(null).map((_, idx) => ({
          image: images[idx % images.length],
          score: Math.max(100 - idx * 4, 50),
          name: `Candidate ${idx + 1}`,
          dob: '1985-05-15',
          sex: idx % 2 === 0 ? 'M' : 'F',
        })),
      },
      {
        probe: image3,
        results: new Array(5).fill(null).map((_, idx) => ({
          image: images[idx % images.length],
          score: Math.max(100 - idx * 6, 50),
          name: `Candidate ${idx + 1}`,
          dob: '1992-10-20',
          sex: idx % 2 === 0 ? 'M' : 'F',
        })),
      },
      {
        probe: image1,
        results: new Array(15).fill(null).map((_, idx) => ({
          image: images[idx % images.length],
          score: Math.max(100 - idx * 5, 50),
          name: `Candidate Name is much longer to ${idx + 1}`,
          dob: '1990-01-01',
          sex: idx % 2 === 0 ? 'M' : 'F',
        })),
      },
      {
        probe: image1,
        results: new Array(15).fill(null).map((_, idx) => ({
          image: images[idx % images.length],
          score: Math.max(100 - idx * 5, 50),
          name: `Candidate Name is much longer to ${idx + 1}`,
          dob: '1990-01-01',
          sex: idx % 2 === 0 ? 'M' : 'F',
        })),
      },
      {
        probe: image1,
        results: new Array(15).fill(null).map((_, idx) => ({
          image: images[idx % images.length],
          score: Math.max(100 - idx * 5, 50),
          name: `Candidate Name is much longer to ${idx + 1}`,
          dob: '1990-01-01',
          sex: idx % 2 === 0 ? 'M' : 'F',
        })),
      },
      {
        probe: image1,
        results: new Array(15).fill(null).map((_, idx) => ({
          image: images[idx % images.length],
          score: Math.max(100 - idx * 5, 50),
          name: `Candidate Name is much longer to ${idx + 1}`,
          dob: '1990-01-01',
          sex: idx % 2 === 0 ? 'M' : 'F',
        })),
      },
      {
        probe: image1,
        results: new Array(15).fill(null).map((_, idx) => ({
          image: images[idx % images.length],
          score: Math.max(100 - idx * 5, 50),
          name: `Candidate Name is much longer to ${idx + 1}`,
          dob: '1990-01-01',
          sex: idx % 2 === 0 ? 'M' : 'F',
        })),
      },
      {
        probe: image1,
        results: new Array(15).fill(null).map((_, idx) => ({
          image: images[idx % images.length],
          score: Math.max(100 - idx * 5, 50),
          name: `Candidate Name is much longer to ${idx + 1}`,
          dob: '1990-01-01',
          sex: idx % 2 === 0 ? 'M' : 'F',
        })),
      },
      {
        probe: image1,
        results: new Array(15).fill(null).map((_, idx) => ({
          image: images[idx % images.length],
          score: Math.max(100 - idx * 5, 50),
          name: `Candidate Name is much longer to ${idx + 1}`,
          dob: '1990-01-01',
          sex: idx % 2 === 0 ? 'M' : 'F',
        })),
      },
      {
        probe: image1,
        results: new Array(15).fill(null).map((_, idx) => ({
          image: images[idx % images.length],
          score: Math.max(100 - idx * 5, 50),
          name: `Candidate Name is much longer to ${idx + 1}`,
          dob: '1990-01-01',
          sex: idx % 2 === 0 ? 'M' : 'F',
        })),
      },
      {
        probe: image1,
        results: new Array(15).fill(null).map((_, idx) => ({
          image: images[idx % images.length],
          score: Math.max(100 - idx * 5, 50),
          name: `Candidate Name is much longer to ${idx + 1}`,
          dob: '1990-01-01',
          sex: idx % 2 === 0 ? 'M' : 'F',
        })),
      },
    ]
  }, [])

  useEffect(() => {
    // Simulate API call
    setIsLoading(true)

    // Simulate network delay with a shorter timeout
    const timer = setTimeout(() => {
      setProbes(generateMockData())
      setIsLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [generateMockData])

  // Set up the initial visible probes
  useEffect(() => {
    if (probes.length > 0) {
      setVisibleProbes(probes.slice(0, probesPerPage))
      setHasMore(probes.length > probesPerPage)
    }
  }, [probes])

  // Load more probes when the user scrolls
  const loadMoreProbes = useCallback(() => {
    const currentLength = visibleProbes.length
    
    if (currentLength >= probes.length) {
      setHasMore(false)
      return
    }
    
    // Add the next batch of probes
    const newProbes = probes.slice(currentLength, currentLength + probesPerPage)
    setVisibleProbes(prev => [...prev, ...newProbes])
    
    // Check if we have more to load
    if (currentLength + probesPerPage >= probes.length) {
      setHasMore(false)
    }
  }, [visibleProbes.length, probes])

  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    if (!observerTarget.current || isLoading) return
    
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore) {
          loadMoreProbes()
        }
      },
      { threshold: 0.1 }
    )
    
    observer.observe(observerTarget.current)
    
    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [hasMore, isLoading, loadMoreProbes])

  // Get the active probe and candidate for the modal
  const activeProbe = useMemo(() => probes[activeProbeIndex], [probes, activeProbeIndex])
  const activeCandidate = useMemo(() =>
    activeProbe?.results[selectedIndex],
    [activeProbe, selectedIndex]
  )

  // Create a virtualized list of probe rows
  const ProbeList = useCallback(({ visibleProbes }) => {
    return (
      <div className="py-4">
        {visibleProbes.map((item, index) => (
          <CRow key={index} className="mb-4">
            <CCol xs={2}>
              <ProbeCard probe={item.probe} />
            </CCol>
            <CCol xs={10}>
              <Suspense fallback={
                <div className="text-center p-3 mt-2" style={{ height: '280px' }}>
                  <CSpinner color="primary" />
                </div>
              }>
                <ResultsRow
                  results={item.results}
                  probeImage={item.probe}
                  probeIndex={index}
                  selectedIndex={selectedIndex}
                  setSelectedIndex={setSelectedIndex}
                  setModalVisible={setModalVisible}
                  setActiveProbeIndex={setActiveProbeIndex}
                />
              </Suspense>
            </CCol>
          </CRow>
        ))}
      </div>
    )
  }, [selectedIndex])

  // For large lists, better to virtualize the entire list of probes
  const renderProbeRows = useCallback(() => {
    return <ProbeList visibleProbes={visibleProbes} />
  }, [visibleProbes, ProbeList])

  // Optimized placeholder - fewer placeholders, simpler structure
  const renderPlaceholders = useCallback(() => {
    return (
      <div className="py-4">
        {[1, 2].map((_, idx) => (
          <CRow key={idx} className="mb-4">
            <CCol xs={2}>
              <CPlaceholder component={CCard} animation="glow" className="h-100">
                <CCardHeader className="text-center bg-transparent">
                  <CPlaceholder xs={4} />
                </CCardHeader>
                <CPlaceholder xs={12} style={{ height: '120px' }} />
                <CCardText className="text-center">
                  <CPlaceholder xs={6} />
                </CCardText>
              </CPlaceholder>
            </CCol>
            <CCol xs={10}>
              <CPlaceholder component="div" animation="glow" className="mt-2" style={{ height: '200px' }}>
                <CPlaceholder xs={12} style={{ height: '100%' }} />
              </CPlaceholder>
            </CCol>
          </CRow>
        ))}
      </div>
    )
  }, [])

  return (
    <CContainer className="py-4">
      {isLoading ? renderPlaceholders() : (
        <>
          {renderProbeRows()}
          {/* Intersection observer target */}
          {hasMore && (
            <div ref={observerTarget} className="text-center py-4">
              <CSpinner color="primary" />
            </div>
          )}
          {!hasMore && visibleProbes.length < probes.length && (
            <CRow className="mt-4">
              <CCol className="text-center">
                <CButton onClick={loadMoreProbes} color="primary">
                  Load More Results
                </CButton>
              </CCol>
            </CRow>
          )}
        </>
      )}

      {activeProbe && activeCandidate && (
        <CandidateModal
          visible={modalVisible}
          setVisible={setModalVisible}
          probeImage={activeProbe.probe}
          candidate={activeCandidate}
          onPrev={() => setSelectedIndex(prev => Math.max(0, prev - 1))}
          onNext={() => setSelectedIndex(prev =>
            Math.min(activeProbe.results.length - 1, prev + 1)
          )}
          showPrev={selectedIndex > 0}
          showNext={selectedIndex < (activeProbe?.results.length - 1 || 0)}
        />
      )}
    </CContainer>
  )
}

export default Faces