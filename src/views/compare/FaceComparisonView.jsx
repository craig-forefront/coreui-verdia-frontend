import React, { useEffect } from 'react'
import { CRow, CCol, CCard, CCardBody, CCardImage, CCardTitle, CCardText, CForm, CFormInput, CFormSelect, CButton, CBadge } from '@coreui/react'
import { useSelector, useDispatch } from 'react-redux'
import { fetchComparisons } from '../store/comparisonsSlice'

const FaceComparisonView = () => {
  const dispatch = useDispatch()
  const { comparisons, status } = useSelector(state => state.comparisons)

  useEffect(() => {
    dispatch(fetchComparisons())
  }, [dispatch])

  return (
    <CRow>
      {/* Left Side - Faces */}
      <CCol md={8}>
        {comparisons.map((pair, index) => (
          <CCard key={index} className="mb-4">
            <CCardBody>
              <CRow>
                {/* Face 1 */}
                <CCol md={6}>
                  <CCardImage orientation="top" src={pair.face1.imageUrl} />
                  <CCardBody>
                    <CCardTitle>{pair.face1.name}</CCardTitle>
                    <CCardText>
                      Age: {pair.face1.age}<br />
                      Sex: {pair.face1.sex}
                    </CCardText>
                  </CCardBody>
                </CCol>

                {/* Face 2 */}
                <CCol md={6}>
                  <CCardImage orientation="top" src={pair.face2.imageUrl} />
                  <CCardBody>
                    <CCardTitle>{pair.face2.name}</CCardTitle>
                    <CCardText>
                      Age: {pair.face2.age}<br />
                      Sex: {pair.face2.sex}
                    </CCardText>
                  </CCardBody>
                </CCol>
              </CRow>

              {/* Comparison Score Below */}
              <div className="text-center mt-3">
                <CBadge color="success" size="lg">
                  Comparison Score: {pair.comparisonScore.toFixed(2)}
                </CBadge>
              </div>
            </CCardBody>
          </CCard>
        ))}
      </CCol>

      {/* Right Side - Filters */}
      <CCol md={4}>
        <CCard>
          <CCardBody>
            <h5>Filters</h5>
            <CForm>
              <CFormInput type="number" label="Min Age" name="minAge" />
              <CFormInput type="number" label="Max Age" name="maxAge" className="mt-2" />
              <CFormSelect label="Sex" className="mt-2">
                <option value="">Any</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </CFormSelect>
              <CFormInput type="number" label="Min Comparison Score" name="minScore" className="mt-2" />
              <CFormSelect label="Largest Image" className="mt-2">
                <option value="">Any</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </CFormSelect>
              <CButton color="primary" className="mt-3 w-100">Apply Filters</CButton>
            </CForm>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default FaceComparisonView
