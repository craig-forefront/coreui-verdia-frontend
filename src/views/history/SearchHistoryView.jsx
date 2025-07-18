import React, { useEffect, useState, useCallback } from 'react'
import {
  CRow, CCol, CCard, CCardBody, CCardHeader,
  CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell,
  CForm, CFormInput, CFormSelect, CButton, CBadge, CSpinner, CAlert,
  CContainer, CPagination, CPaginationItem, CInputGroup, CInputGroupText,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CDropdown, CDropdownToggle, CDropdownMenu, CDropdownItem
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSearch, cilReload, cilTrash, cilCalendar, cilFilter,
  cilInfo, cilCheck, cilX
} from '@coreui/icons'
import { useSelector, useDispatch } from 'react-redux'
import { 
  fetchSearchHistory, 
  deleteSearchHistoryEntry,
  clearSearchHistory,
  setHistoryFilters,
  resetHistoryFilters 
} from '../../store/searchHistorySlice'

// Helper function to determine status badge color
const getStatusColor = (status) => {
  switch (status) {
    case 'completed': return 'success'
    case 'failed': return 'danger'
    case 'in_progress': return 'warning'
    default: return 'secondary'
  }
}

// Helper function to determine search type badge color
const getSearchTypeColor = (searchType) => {
  switch (searchType) {
    case 'face_image': return 'primary'
    case 'face_video': return 'info'
    default: return 'secondary'
  }
}

// Format date for display
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString()
}

// Format execution time
const formatExecutionTime = (timeMs) => {
  if (!timeMs) return 'N/A'
  if (timeMs < 1000) return `${Math.round(timeMs)}ms`
  return `${(timeMs / 1000).toFixed(2)}s`
}

// Search History Detail Modal Component
const SearchHistoryDetailModal = ({ entry, visible, onClose }) => {
  if (!entry) return null

  return (
    <CModal visible={visible} onClose={onClose} size="lg">
      <CModalHeader>
        <CModalTitle>Search History Details</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CRow className="mb-3">
          <CCol sm={3}><strong>Search ID:</strong></CCol>
          <CCol sm={9}><code>{entry.search_id}</code></CCol>
        </CRow>
        <CRow className="mb-3">
          <CCol sm={3}><strong>Type:</strong></CCol>
          <CCol sm={9}>
            <CBadge color={getSearchTypeColor(entry.search_type)}>
              {entry.search_type}
            </CBadge>
          </CCol>
        </CRow>
        <CRow className="mb-3">
          <CCol sm={3}><strong>Status:</strong></CCol>
          <CCol sm={9}>
            <CBadge color={getStatusColor(entry.status)}>
              {entry.status}
            </CBadge>
          </CCol>
        </CRow>
        <CRow className="mb-3">
          <CCol sm={3}><strong>Timestamp:</strong></CCol>
          <CCol sm={9}>{formatDate(entry.timestamp)}</CCol>
        </CRow>
        <CRow className="mb-3">
          <CCol sm={3}><strong>Results Count:</strong></CCol>
          <CCol sm={9}>{entry.results_count}</CCol>
        </CRow>
        <CRow className="mb-3">
          <CCol sm={3}><strong>Execution Time:</strong></CCol>
          <CCol sm={9}>{formatExecutionTime(entry.execution_time_ms)}</CCol>
        </CRow>
        {entry.error_message && (
          <CRow className="mb-3">
            <CCol sm={3}><strong>Error:</strong></CCol>
            <CCol sm={9} className="text-danger">{entry.error_message}</CCol>
          </CRow>
        )}
        {entry.query_data && (
          <CRow className="mb-3">
            <CCol sm={3}><strong>Query Data:</strong></CCol>
            <CCol sm={9}>
              <pre style={{ 
                background: '#f8f9fa', 
                padding: '10px', 
                borderRadius: '4px',
                fontSize: '0.875rem',
                maxHeight: '200px',
                overflow: 'auto'
              }}>
                {JSON.stringify(entry.query_data, null, 2)}
              </pre>
            </CCol>
          </CRow>
        )}
        {entry.metadata && Object.keys(entry.metadata).length > 0 && (
          <CRow className="mb-3">
            <CCol sm={3}><strong>Metadata:</strong></CCol>
            <CCol sm={9}>
              <pre style={{ 
                background: '#f8f9fa', 
                padding: '10px', 
                borderRadius: '4px',
                fontSize: '0.875rem',
                maxHeight: '200px',
                overflow: 'auto'
              }}>
                {JSON.stringify(entry.metadata, null, 2)}
              </pre>
            </CCol>
          </CRow>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

const SearchHistoryView = () => {
  const dispatch = useDispatch()
  const { 
    entries, 
    totalCount, 
    loading, 
    error, 
    filters,
    hasMore 
  } = useSelector(state => state.searchHistory)

  // Local state
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState(null)

  // Load initial data
  useEffect(() => {
    dispatch(fetchSearchHistory())
  }, [dispatch])

  // Handle filter changes
  const handleFilterChange = useCallback((field, value) => {
    dispatch(setHistoryFilters({ [field]: value }))
    // Auto-fetch with new filters
    dispatch(fetchSearchHistory())
  }, [dispatch])

  // Handle search
  const handleSearch = useCallback(() => {
    dispatch(fetchSearchHistory())
  }, [dispatch])

  // Handle refresh
  const handleRefresh = useCallback(() => {
    dispatch(fetchSearchHistory())
  }, [dispatch])

  // Handle reset filters
  const handleResetFilters = useCallback(() => {
    dispatch(resetHistoryFilters())
    dispatch(fetchSearchHistory())
  }, [dispatch])

  // Handle page change
  const handlePageChange = useCallback((page) => {
    dispatch(setHistoryFilters({ page }))
    dispatch(fetchSearchHistory())
  }, [dispatch])

  // Handle view details
  const handleViewDetails = useCallback((entry) => {
    setSelectedEntry(entry)
    setDetailModalVisible(true)
  }, [])

  // Handle delete entry
  const handleDeleteEntry = useCallback((entry) => {
    setEntryToDelete(entry)
    setDeleteConfirmVisible(true)
  }, [])

  // Confirm delete
  const confirmDelete = useCallback(() => {
    if (entryToDelete) {
      dispatch(deleteSearchHistoryEntry(entryToDelete.search_id))
        .then(() => {
          setDeleteConfirmVisible(false)
          setEntryToDelete(null)
          // Refresh the list
          dispatch(fetchSearchHistory())
        })
    }
  }, [dispatch, entryToDelete])

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / filters.page_size)
  const currentPage = filters.page

  return (
    <CContainer fluid>
      <CRow>
        <CCol>
          <CCard>
            <CCardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0">Search History</h4>
                <div className="d-flex gap-2">
                  <CButton
                    color="outline-primary"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={loading}
                  >
                    <CIcon icon={cilReload} className="me-1" />
                    Refresh
                  </CButton>
                  <CButton
                    color="outline-secondary"
                    size="sm"
                    onClick={handleResetFilters}
                  >
                    Reset Filters
                  </CButton>
                </div>
              </div>
            </CCardHeader>
            <CCardBody>
              {/* Filters */}
              <CForm className="mb-4">
                <CRow className="g-3">
                  <CCol md={3}>
                    <CFormSelect
                      value={filters.search_type || ''}
                      onChange={(e) => handleFilterChange('search_type', e.target.value || null)}
                    >
                      <option value="">All Types</option>
                      <option value="face_image">Face Image</option>
                      <option value="face_video">Face Video</option>
                    </CFormSelect>
                  </CCol>
                  <CCol md={3}>
                    <CFormSelect
                      value={filters.status || ''}
                      onChange={(e) => handleFilterChange('status', e.target.value || null)}
                    >
                      <option value="">All Status</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                      <option value="in_progress">In Progress</option>
                    </CFormSelect>
                  </CCol>
                  <CCol md={2}>
                    <CFormSelect
                      value={filters.page_size}
                      onChange={(e) => handleFilterChange('page_size', parseInt(e.target.value))}
                    >
                      <option value={10}>10 per page</option>
                      <option value={20}>20 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                    </CFormSelect>
                  </CCol>
                  <CCol md={4}>
                    <CInputGroup>
                      <CButton
                        type="button"
                        color="primary"
                        onClick={handleSearch}
                        disabled={loading}
                      >
                        <CIcon icon={cilSearch} className="me-1" />
                        Search
                      </CButton>
                    </CInputGroup>
                  </CCol>
                </CRow>
              </CForm>

              {/* Error Display */}
              {error && (
                <CAlert color="danger" className="mb-4">
                  <strong>Error:</strong> {error}
                </CAlert>
              )}

              {/* Results Summary */}
              <div className="mb-3">
                <small className="text-muted">
                  Showing {entries.length} of {totalCount} search history entries
                  {filters.search_type && ` (filtered by type: ${filters.search_type})`}
                  {filters.status && ` (filtered by status: ${filters.status})`}
                </small>
              </div>

              {/* Loading Spinner */}
              {loading && (
                <div className="text-center py-4">
                  <CSpinner color="primary" />
                </div>
              )}

              {/* Results Table */}
              {!loading && entries.length > 0 && (
                <>
                  <CTable striped hover responsive>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Timestamp</CTableHeaderCell>
                        <CTableHeaderCell>Type</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell>Results</CTableHeaderCell>
                        <CTableHeaderCell>Execution Time</CTableHeaderCell>
                        <CTableHeaderCell>Actions</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {entries.map((entry) => (
                        <CTableRow key={entry.search_id}>
                          <CTableDataCell>
                            <div>{formatDate(entry.timestamp)}</div>
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={getSearchTypeColor(entry.search_type)}>
                              {entry.search_type}
                            </CBadge>
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={getStatusColor(entry.status)}>
                              {entry.status}
                            </CBadge>
                          </CTableDataCell>
                          <CTableDataCell>
                            {entry.results_count}
                          </CTableDataCell>
                          <CTableDataCell>
                            {formatExecutionTime(entry.execution_time_ms)}
                          </CTableDataCell>
                          <CTableDataCell>
                            <div className="d-flex gap-1">
                              <CButton
                                color="outline-info"
                                size="sm"
                                onClick={() => handleViewDetails(entry)}
                                title="View Details"
                              >
                                <CIcon icon={cilInfo} />
                              </CButton>
                              <CButton
                                color="outline-danger"
                                size="sm"
                                onClick={() => handleDeleteEntry(entry)}
                                title="Delete Entry"
                              >
                                <CIcon icon={cilTrash} />
                              </CButton>
                            </div>
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-center mt-4">
                      <CPagination>
                        <CPaginationItem
                          disabled={currentPage <= 1}
                          onClick={() => handlePageChange(currentPage - 1)}
                        >
                          Previous
                        </CPaginationItem>
                        {[...Array(Math.min(10, totalPages))].map((_, i) => {
                          const page = i + 1
                          return (
                            <CPaginationItem
                              key={page}
                              active={page === currentPage}
                              onClick={() => handlePageChange(page)}
                            >
                              {page}
                            </CPaginationItem>
                          )
                        })}
                        <CPaginationItem
                          disabled={currentPage >= totalPages}
                          onClick={() => handlePageChange(currentPage + 1)}
                        >
                          Next
                        </CPaginationItem>
                      </CPagination>
                    </div>
                  )}
                </>
              )}

              {/* No Results */}
              {!loading && entries.length === 0 && (
                <div className="text-center py-5">
                  <div className="text-muted mb-3">
                    <CIcon icon={cilSearch} size="3xl" />
                  </div>
                  <h5>No search history found</h5>
                  <p className="text-muted">
                    No search history entries match your current filters.
                  </p>
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Detail Modal */}
      <SearchHistoryDetailModal
        entry={selectedEntry}
        visible={detailModalVisible}
        onClose={() => {
          setDetailModalVisible(false)
          setSelectedEntry(null)
        }}
      />

      {/* Delete Confirmation Modal */}
      <CModal visible={deleteConfirmVisible} onClose={() => setDeleteConfirmVisible(false)}>
        <CModalHeader>
          <CModalTitle>Confirm Delete</CModalTitle>
        </CModalHeader>
        <CModalBody>
          Are you sure you want to delete this search history entry?
          {entryToDelete && (
            <div className="mt-2">
              <strong>Entry:</strong> {entryToDelete.search_type} search from {formatDate(entryToDelete.timestamp)}
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDeleteConfirmVisible(false)}>
            Cancel
          </CButton>
          <CButton color="danger" onClick={confirmDelete}>
            Delete
          </CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default SearchHistoryView
