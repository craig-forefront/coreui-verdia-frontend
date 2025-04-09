import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  CRow, CCol, CCard, CCardBody, CCardImage, CCardTitle,
  CCardText, CForm, CFormInput, CFormSelect, CButton,
  CBadge, CSpinner, CAlert
} from '@coreui/react'
import { useSelector, useDispatch } from 'react-redux'
import { FixedSizeList as List } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import { fetchComparisons } from '../store/comparisonsSlice'

// Extracted Face Card Component for reusability
const FaceCard = React.memo(({ face }) => (
  <CCol md={6}>
    <CCardImage
      orientation="top"
      src={face.imageUrl}
      style={{ height: '200px', objectFit: 'cover' }}
    />
    <CCardBody>
      <CCardTitle>{face.name}</CCardTitle>
      <CCardText>
        Age: {face.age}<br />
        Sex: {face.sex}
      </CCardText>
    </CCardBody>
  </CCol>
));

// Extracted Comparison Card Component
const ComparisonCard = React.memo(({ pair }) => (
  <CCard className="mb-4">
    <CCardBody>
      <CRow>
        <FaceCard face={pair.face1} />
        <FaceCard face={pair.face2} />
      </CRow>
      <div className="text-center mt-3">
        <CBadge color={getScoreColor(pair.comparisonScore)} size="lg">
          Comparison Score: {pair.comparisonScore.toFixed(2)}
        </CBadge>
      </div>
    </CCardBody>
  </CCard>
));

// Score color helper
const getScoreColor = (score) => {
  if (score >= 90) return 'success';
  if (score >= 70) return 'info';
  return 'danger';
};

const FaceComparisonView = () => {
  const dispatch = useDispatch();
  const { comparisons, status, error } = useSelector(state => state.comparisons);
  const [filters, setFilters] = useState({
    minAge: '',
    maxAge: '',
    sex: '',
    minScore: '',
    largestImage: ''
  });

  // Load comparisons on mount
  useEffect(() => {
    dispatch(fetchComparisons());
  }, [dispatch]);

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Apply filters
  const applyFilters = useCallback((e) => {
    e.preventDefault();
    // Dispatch action to apply filters
    // You can implement this in your redux slice
    // dispatch(filterComparisons(filters));
    console.log('Applying filters:', filters);
  }, [filters]);

  // Filter comparisons based on current filters
  const filteredComparisons = useMemo(() => {
    return comparisons.filter(pair => {
      // Filter by min age
      if (filters.minAge && (pair.face1.age < Number(filters.minAge) || pair.face2.age < Number(filters.minAge))) {
        return false;
      }

      // Filter by max age
      if (filters.maxAge && (pair.face1.age > Number(filters.maxAge) || pair.face2.age > Number(filters.maxAge))) {
        return false;
      }

      // Filter by sex
      if (filters.sex && (pair.face1.sex.toLowerCase() !== filters.sex && pair.face2.sex.toLowerCase() !== filters.sex)) {
        return false;
      }

      // Filter by minimum comparison score
      if (filters.minScore && pair.comparisonScore < Number(filters.minScore)) {
        return false;
      }

      return true;
    });
  }, [comparisons, filters]);

  // Render virtualized item
  const renderComparisonItem = useCallback(({ index, style }) => {
    const pair = filteredComparisons[index];
    return (
      <div style={style}>
        <ComparisonCard pair={pair} />
      </div>
    );
  }, [filteredComparisons]);

  // Loading state
  if (status === 'loading') {
    return (
      <div className="d-flex justify-content-center my-5">
        <CSpinner color="primary" />
      </div>
    );
  }

  // Error state
  if (status === 'failed') {
    return (
      <CAlert color="danger">
        Error loading comparison data: {error}
      </CAlert>
    );
  }

  return (
    <CRow>
      {/* Left Side - Faces */}
      <CCol md={8}>
        {filteredComparisons.length === 0 ? (
          <CAlert color="info">
            No face comparisons match your current filters.
          </CAlert>
        ) : (
          <div style={{ height: 'calc(100vh - 150px)', width: '100%' }}>
            <AutoSizer>
              {({ height, width }) => (
                <List
                  height={height}
                  width={width}
                  itemCount={filteredComparisons.length}
                  itemSize={450} // Adjust based on your card height
                >
                  {renderComparisonItem}
                </List>
              )}
            </AutoSizer>
          </div>
        )}
      </CCol>

      {/* Right Side - Filters */}
      <CCol md={4}>
        <CCard>
          <CCardBody>
            <h5>Filters</h5>
            <CForm onSubmit={applyFilters}>
              <CFormInput
                type="number"
                label="Min Age"
                name="minAge"
                value={filters.minAge}
                onChange={handleFilterChange}
              />
              <CFormInput
                type="number"
                label="Max Age"
                name="maxAge"
                className="mt-2"
                value={filters.maxAge}
                onChange={handleFilterChange}
              />
              <CFormSelect
                label="Sex"
                className="mt-2"
                name="sex"
                value={filters.sex}
                onChange={handleFilterChange}
              >
                <option value="">Any</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </CFormSelect>
              <CFormInput
                type="number"
                label="Min Comparison Score"
                name="minScore"
                className="mt-2"
                value={filters.minScore}
                onChange={handleFilterChange}
              />
              <CFormSelect
                label="Largest Image"
                className="mt-2"
                name="largestImage"
                value={filters.largestImage}
                onChange={handleFilterChange}
              >
                <option value="">Any</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </CFormSelect>
              <CButton type="submit" color="primary" className="mt-3 w-100">
                Apply Filters
              </CButton>
              {filters.minAge || filters.maxAge || filters.sex || filters.minScore || filters.largestImage ? (
                <CButton
                  color="link"
                  className="mt-2 w-100"
                  onClick={() => setFilters({
                    minAge: '',
                    maxAge: '',
                    sex: '',
                    minScore: '',
                    largestImage: ''
                  })}
                >
                  Clear Filters
                </CButton>
              ) : null}
            </CForm>
          </CCardBody>
        </CCard>

        <CCard className="mt-4">
          <CCardBody>
            <h5>Statistics</h5>
            <CCardText>Total Comparisons: {comparisons.length}</CCardText>
            <CCardText>Filtered Comparisons: {filteredComparisons.length}</CCardText>
            <CCardText>Average Score: {
              filteredComparisons.length > 0 ?
                (filteredComparisons.reduce((sum, pair) => sum + pair.comparisonScore, 0) /
                  filteredComparisons.length).toFixed(2) :
                'N/A'
            }</CCardText>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default FaceComparisonView;
