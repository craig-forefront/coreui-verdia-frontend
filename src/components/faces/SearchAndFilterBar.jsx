import React from 'react';
import {
    CForm,
    CRow,
    CCol,
    CInputGroup,
    CFormInput,
    CButton,
    CFormSelect
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilSearch } from '@coreui/icons';

/**
 * Component for searching, sorting, and filtering face groups
 */
const SearchAndFilterBar = ({
    searchTerm,
    setSearchTerm,
    sortOption,
    setSortOption,
    filterOption,
    setFilterOption
}) => {
    return (
        <CForm>
            <CRow>
                <CCol>
                    <CInputGroup>
                        <CFormInput
                            placeholder="Search groups..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <CButton type="button" color="primary" variant="outline">
                            <CIcon icon={cilSearch} />
                        </CButton>
                    </CInputGroup>
                </CCol>
            </CRow>
            <CRow className="mt-2">
                <CCol xs={7}>
                    <CFormSelect
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                        aria-label="Sort By"
                    >
                        <option value="default">Default Order</option>
                        <option value="name-asc">Name (A-Z)</option>
                        <option value="name-desc">Name (Z-A)</option>
                        <option value="count-desc">Face Count (High to Low)</option>
                        <option value="count-asc">Face Count (Low to High)</option>
                        <option value="confidence-desc">Confidence (High to Low)</option>
                        <option value="confidence-asc">Confidence (Low to High)</option>
                    </CFormSelect>
                </CCol>
                <CCol xs={5}>
                    <CFormSelect
                        value={filterOption}
                        onChange={(e) => setFilterOption(e.target.value)}
                        aria-label="Filter By"
                    >
                        <option value="all">All Groups</option>
                        <option value="high-confidence">High Confidence</option>
                        <option value="low-confidence">Low Confidence</option>
                    </CFormSelect>
                </CCol>
            </CRow>
        </CForm>
    );
};

export default SearchAndFilterBar;