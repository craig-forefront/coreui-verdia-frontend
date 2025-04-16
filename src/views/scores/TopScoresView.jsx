import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  CRow, CCol, CCard, CCardBody, CCardImage, CCardTitle,
  CCardText, CForm, CFormInput, CFormSelect, CButton,
  CBadge, CSpinner, CAlert, CContainer, CPlaceholder
} from '@coreui/react'
import { useSelector, useDispatch } from 'react-redux'
import { fetchTopScores, setFilters, resetFilters } from '../../store/topScoresSlice'

// Helper function to determine score color
const getScoreColor = (score) => {
  if (score >= 0.9) return 'success'
  if (score >= 0.7) return 'info'
  return 'danger'
}

// Debounce helper function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Score component to display between images
const ScoreDisplay = ({ score }) => (
  <div className="d-flex flex-column align-items-center justify-content-center h-100">
    <div className="text-center">
      <h4>Score</h4>
      <CBadge color={getScoreColor(score)} size="xl" style={{ fontSize: '1.5rem', padding: '10px 15px' }}>
        {score.toFixed(2)}
      </CBadge>
    </div>
  </div>
)

// Image card component
const PersonCard = ({ person, title }) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  // Reset states when image_url changes
  useEffect(() => {
    setImageLoaded(false)
    setImageError(false)
    
    if (!person.image_url) {
      setImageError(true)
      return
    }
    
    const img = new Image()
    img.src = person.image_url
    
    img.onload = () => {
      setImageLoaded(true)
      setImageError(false)
    }
    
    img.onerror = () => {
      console.error(`Failed to load image: ${person.image_url}`)
      setImageError(true)
      setImageLoaded(true)
    }
    
    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [person.image_url])

  return (
    <CCard className="h-100">
      {!imageLoaded ? (
        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CSpinner color="primary" />
        </div>
      ) : imageError ? (
        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
          <div className="text-center text-muted">
            <i className="fa fa-image" style={{ fontSize: '2rem' }}></i>
            <div>No Image</div>
          </div>
        </div>
      ) : (
        <CCardImage
          orientation="top"
          src={person.image_url}
          style={{ height: '200px', objectFit: 'contain' }}
        />
      )}
      <CCardBody>
        <CCardTitle>{title}: {person.name || 'Unknown'}</CCardTitle>
        <CCardText>
          Age: {person.age || 'Unknown'}<br />
          Sex: {person.sex || 'Unknown'}
        </CCardText>
      </CCardBody>
    </CCard>
  )
}

// Result row component
const ScoreResultRow = ({ result }) => (
  <CCard className="mb-4">
    <CCardBody>
      <CRow className="align-items-center">
        <CCol md={5}>
          <PersonCard 
            person={{
              image_url: result.probe_image_url,
              image_path: result.probe_image_path,
              name: result.probe_name,
              age: result.probe_age,
              sex: result.probe_sex
            }} 
            title="Probe"
          />
        </CCol>
        
        <CCol md={2}>
          <ScoreDisplay score={result.score} />
        </CCol>
        
        <CCol md={5}>
          <PersonCard 
            person={{
              image_url: result.candidate_image_url,
              image_path: result.candidate_image_path,
              name: result.candidate_name,
              age: result.candidate_age,
              sex: result.candidate_sex
            }} 
            title="Candidate"
          />
        </CCol>
      </CRow>
    </CCardBody>
  </CCard>
) 

// Main component
const TopScoresView = () => {
  const dispatch = useDispatch()
  const { results, totalCount, hasMore, status, error, filters } = useSelector(state => state.topScores)
  const [localFilters, setLocalFilters] = useState({
    threshold: filters.threshold,
    sex: filters.sex,
    minAge: filters.minAge,
    maxAge: filters.maxAge
  })
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [lastLoadTime, setLastLoadTime] = useState(0)
  
  // Add state to track current filter results
  const [currentResultsCount, setCurrentResultsCount] = useState(0)
  const [isFiltering, setIsFiltering] = useState(false)
  
  // Update currentResultsCount whenever results change and we're not loading more
  useEffect(() => {
    if (!isLoadingMore) {
      setCurrentResultsCount(results.length)
    }
  }, [results, isLoadingMore])
  
  // Ref for intersection observer (infinite scroll)
  const observerRef = useRef(null)
  const observerTarget = useRef(null)
  
  // Minimum time between loads (in milliseconds)
  const LOAD_COOLDOWN = 1000

  // Load initial data on mount
  useEffect(() => {
    dispatch(fetchTopScores({
      ...filters,
      isLoadingMore: false,
      offset: 0
    }))
      .then(() => setIsInitialLoad(false))
  }, [dispatch])

  // Memoized loadMore function to prevent recreation on each render
  const loadMore = useCallback(() => {
    // Check if we're already loading, if there's nothing more to load, or if we're in cooldown
    const now = Date.now()
    if (
      status === 'loading' || 
      !hasMore || 
      isLoadingMore || 
      (now - lastLoadTime < LOAD_COOLDOWN)
    ) {
      return
    }
    
    // Set loading state and update last load time
    setIsLoadingMore(true)
    setLastLoadTime(now)
    
    const newOffset = filters.offset + filters.limit
    
    // First update the offset in the store
    dispatch(setFilters({ offset: newOffset }))
    
    // Then fetch more results with isLoadingMore flag
    dispatch(fetchTopScores({
      ...filters,
      offset: newOffset,
      isLoadingMore: true // This signals we want to append not replace
    }))
      .finally(() => {
        setIsLoadingMore(false)
      })
  }, [dispatch, filters, hasMore, status, isLoadingMore, lastLoadTime])

  // Memoized debounced version of loadMore
  const debouncedLoadMore = useCallback(() => {
    let timeoutId = null
    
    const handler = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        loadMore()
      }, 300)
    }
    
    handler()
    
    return () => {
      clearTimeout(timeoutId)
    }
  }, [loadMore])

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    // Skip setup if we have no more results or are in a loading state
    if (!hasMore || status === 'loading') return
    
    // Clean up any existing observer
    if (observerRef.current) {
      observerRef.current.disconnect()
    }
    
    // Observer options
    const options = {
      root: null,
      rootMargin: '200px',
      threshold: 0.1,
    }
    
    // Observer callback
    const handleObserver = (entries) => {
      const [entry] = entries
      if (entry.isIntersecting && hasMore && status !== 'loading' && !isLoadingMore) {
        debouncedLoadMore()
      }
    }
    
    // Create new observer
    const observer = new IntersectionObserver(handleObserver, options)
    observerRef.current = observer
    
    // Start observing
    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }
    
    // Cleanup function
    return () => {
      if (observer && observerTarget.current) {
        observer.disconnect()
      }
    }
  }, [hasMore, status, isLoadingMore, debouncedLoadMore])

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setLocalFilters(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Apply filters
  const applyFilters = (e) => {
    e.preventDefault()
    setIsInitialLoad(true)
    setIsFiltering(true)
    // Clear visible results immediately to update statistics
    setCurrentResultsCount(0)
    // Reset offset when applying new filters
    dispatch(setFilters({ 
      ...localFilters, 
      resetOffset: true // Add flag to reset offset
    }))
    dispatch(fetchTopScores({
      ...filters,
      ...localFilters,
      offset: 0,
      isLoadingMore: false // This is a new search, not pagination
    }))
      .then(() => {
        setIsInitialLoad(false)
        setIsFiltering(false)
        // Scroll to top when filters are applied
        window.scrollTo(0, 0)
      })
  }

  // Clear all filters
  const clearFilters = () => {
    setLocalFilters({
      threshold: '',
      sex: '',
      minAge: '',
      maxAge: ''
    })
    setIsInitialLoad(true)
    setIsFiltering(true)
    // Clear visible results immediately to update statistics
    setCurrentResultsCount(0)
    dispatch(resetFilters())
    dispatch(fetchTopScores({ 
      threshold: 0.7,
      sex: '',
      minAge: '',
      maxAge: '',
      limit: 10,
      offset: 0,
      isLoadingMore: false // This is a new search, not pagination
    }))
      .then(() => {
        setIsInitialLoad(false)
        setIsFiltering(false)
        // Scroll to top when filters are cleared
        window.scrollTo(0, 0)
      })
  }

  // Render placeholder cards when loading
  const renderPlaceholders = () => {
    return Array(3).fill(0).map((_, index) => (
      <CCard className="mb-4" key={`placeholder-${index}`}>
        <CCardBody>
          <CRow className="align-items-center">
            <CCol md={5}>
              <CCard className="h-100">
                <CPlaceholder component="div" animation="glow">
                  <CPlaceholder xs={12} style={{ height: '200px' }} />
                </CPlaceholder>
                <CCardBody>
                  <CPlaceholder component={CCardTitle} animation="glow">
                    <CPlaceholder xs={6} />
                  </CPlaceholder>
                  <CPlaceholder component={CCardText} animation="glow">
                    <CPlaceholder xs={7} /> <br />
                    <CPlaceholder xs={4} />
                  </CPlaceholder>
                </CCardBody>
              </CCard>
            </CCol>
            
            <CCol md={2}>
              <div className="d-flex flex-column align-items-center justify-content-center h-100">
                <div className="text-center">
                  <CPlaceholder component="h4" animation="glow">
                    <CPlaceholder xs={4} />
                  </CPlaceholder>
                  <CPlaceholder animation="glow">
                    <CPlaceholder xs={8} style={{ height: '2rem' }} />
                  </CPlaceholder>
                </div>
              </div>
            </CCol>
            
            <CCol md={5}>
              <CCard className="h-100">
                <CPlaceholder component="div" animation="glow">
                  <CPlaceholder xs={12} style={{ height: '200px' }} />
                </CPlaceholder>
                <CCardBody>
                  <CPlaceholder component={CCardTitle} animation="glow">
                    <CPlaceholder xs={6} />
                  </CPlaceholder>
                  <CPlaceholder component={CCardText} animation="glow">
                    <CPlaceholder xs={7} /> <br />
                    <CPlaceholder xs={4} />
                  </CPlaceholder>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>
    ))
  }

  // Loading state
  if (status === 'loading' && isInitialLoad) {
    return (
      <div className="d-flex justify-content-center my-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  // Error state
  if (status === 'failed') {
    return (
      <CAlert color="danger">
        Error loading data: {typeof error === 'object' ? 
          (error.detail || JSON.stringify(error)) : 
          error}
      </CAlert>
    )
  }

  return (
    <CContainer>
      <h2 className="mb-4">Top Score Matches</h2>
      
      <CRow>
        {/* Results Column */}
        <CCol md={8}>
          {results.length === 0 && !isInitialLoad && status !== 'loading' ? (
            <CAlert color="info">
              No results match your current filters.
            </CAlert>
          ) : (
            <>
              {/* Display real results */}
              {results.map((result, index) => (
                <ScoreResultRow key={`result-${index}`} result={result} />
              ))}
              
              {/* Show placeholders when loading more */}
              {status === 'loading' && !isInitialLoad && renderPlaceholders()}
              
              {/* Infinite scroll observer target */}
              {hasMore && (
                <div 
                  ref={observerTarget} 
                  className="text-center my-4"
                  style={{ height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                  {isLoadingMore && <CSpinner color="primary" />}
                </div>
              )}
              
              {/* End of results message */}
              {!hasMore && results.length > 0 && (
                <div className="text-center text-muted my-4">
                  <p>End of results</p>
                </div>
              )}
            </>
          )}
        </CCol>
        
        {/* Filters Column - Made sticky */}
        <CCol md={4}>
          <div style={{ position: 'sticky', top: '150px' }}>
            <CCard>
              <CCardBody>
                <h5>Filters</h5>
                <CForm onSubmit={applyFilters}>
                  <CFormInput
                    type="number"
                    label="Score Threshold"
                    name="threshold"
                    value={localFilters.threshold}
                    onChange={handleFilterChange}
                    step="0.01"
                    min="0"
                    max="1"
                  />
                  <CFormSelect
                    label="Sex"
                    className="mt-2"
                    name="sex"
                    value={localFilters.sex}
                    onChange={handleFilterChange}
                  >
                    <option value="">Any</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </CFormSelect>
                  <CFormInput
                    type="number"
                    label="Min Age"
                    name="minAge"
                    className="mt-2"
                    value={localFilters.minAge}
                    onChange={handleFilterChange}
                  />
                  <CFormInput
                    type="number"
                    label="Max Age"
                    name="maxAge"
                    className="mt-2"
                    value={localFilters.maxAge}
                    onChange={handleFilterChange}
                  />
                  <CButton type="submit" color="primary" className="mt-3 w-100">
                    Apply Filters
                  </CButton>
                  <CButton
                    color="secondary"
                    className="mt-2 w-100"
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </CButton>
                </CForm>
              </CCardBody>
            </CCard>

            {/* Statistics Card */}
            <CCard className="mt-4">
              <CCardBody>
                <h5>Statistics</h5>
                <CCardText>Total Results: {totalCount || 0}</CCardText>
                <CCardText>Results Loaded: {results.length}</CCardText>
                {results.length > 0 && (
                  <CCardText>
                    Average Score: {
                      (results.reduce((sum, result) => sum + result.score, 0) / results.length).toFixed(2)
                    }
                  </CCardText>
                )}
              </CCardBody>
            </CCard>
          </div>
        </CCol>
      </CRow>
    </CContainer>
  )
}

export default TopScoresView