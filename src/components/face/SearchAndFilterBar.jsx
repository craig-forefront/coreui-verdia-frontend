import React, { useCallback, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    CForm,
    CRow,
    CCol,
    CInputGroup,
    CFormInput,
    CButton,
    CFormSelect,
    CBadge,
    CTooltip
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilSearch, cilX } from '@coreui/icons';

// Custom hooks
import useDebounce from '../../hooks/useDebounce';
import useLocalStorage from '../../hooks/useLocalStorage';

/**
 * Enhanced SearchAndFilterBar component with Redux integration and user preferences
 */
const SearchAndFilterBar = ({
    // Legacy props for backward compatibility
    searchTerm: legacySearchTerm,
    setSearchTerm: legacySetSearchTerm,
    sortOption: legacySortOption,
    setSortOption: legacySetSortOption,
    filterOption: legacyFilterOption,
    setFilterOption: legacySetFilterOption,
    // New props
    videoId,
    className = '',
    compact = false,
    enableRedux = false // Flag to enable Redux mode vs legacy prop mode
}) => {
    const searchInputRef = useRef(null);
    
    // Local preferences with localStorage
    const [localPrefs, setLocalPrefs] = useLocalStorage('searchAndFilterPrefs', {
        enableDebouncing: true,
        debounceDelay: 300,
        enableKeyboardShortcuts: true,
        autoFocusSearch: false, // Disabled by default to avoid conflicts
        rememberLastSort: true,
        rememberLastFilter: true
    });

    // Use legacy props (for backward compatibility)
    const searchTerm = legacySearchTerm || '';
    const sortOption = legacySortOption || 'default';
    const filterOption = legacyFilterOption || 'all';

    // Debounced search term for performance
    const debouncedSearchTerm = useDebounce(
        searchTerm, 
        localPrefs.enableDebouncing ? localPrefs.debounceDelay : 0
    );

    // Handle search input changes
    const handleSearchChange = useCallback((e) => {
        const value = e.target.value;
        if (legacySetSearchTerm) {
            legacySetSearchTerm(value);
        }
    }, [legacySetSearchTerm]);

    // Handle search submission
    const handleSearchSubmit = useCallback((e) => {
        e.preventDefault();
        searchInputRef.current?.blur();
    }, []);

    // Handle sort change
    const handleSortChange = useCallback((value) => {
        if (legacySetSortOption) {
            legacySetSortOption(value);
        }
        
        if (localPrefs.rememberLastSort) {
            setLocalPrefs(prev => ({ ...prev, lastSortOption: value }));
        }
    }, [legacySetSortOption, localPrefs.rememberLastSort, setLocalPrefs]);

    // Handle filter change
    const handleFilterChange = useCallback((value) => {
        if (legacySetFilterOption) {
            legacySetFilterOption(value);
        }
        
        if (localPrefs.rememberLastFilter) {
            setLocalPrefs(prev => ({ ...prev, lastFilterOption: value }));
        }
    }, [legacySetFilterOption, localPrefs.rememberLastFilter, setLocalPrefs]);

    // Clear search
    const handleClearSearch = useCallback(() => {
        if (legacySetSearchTerm) {
            legacySetSearchTerm('');
        }
        if (localPrefs.autoFocusSearch) {
            searchInputRef.current?.focus();
        }
    }, [legacySetSearchTerm, localPrefs.autoFocusSearch]);

    // Restore saved preferences on mount
    useEffect(() => {
        if (localPrefs.rememberLastSort && localPrefs.lastSortOption && sortOption === 'default' && legacySetSortOption) {
            legacySetSortOption(localPrefs.lastSortOption);
        }
        if (localPrefs.rememberLastFilter && localPrefs.lastFilterOption && filterOption === 'all' && legacySetFilterOption) {
            legacySetFilterOption(localPrefs.lastFilterOption);
        }
    }, []); // Only run on mount

    return (
        <div className={`search-filter-bar ${className}`}>
            <CForm onSubmit={handleSearchSubmit}>
                {/* Main Search Row */}
                <CRow>
                    <CCol>
                        <CInputGroup>
                            <CFormInput
                                ref={searchInputRef}
                                placeholder="Search groups..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                            />
                            {searchTerm && (
                                <CButton 
                                    type="button" 
                                    color="secondary" 
                                    variant="outline"
                                    onClick={handleClearSearch}
                                >
                                    <CIcon icon={cilX} />
                                </CButton>
                            )}
                            <CTooltip content="Search groups">
                                <CButton type="submit" color="primary" variant="outline">
                                    <CIcon icon={cilSearch} />
                                </CButton>
                            </CTooltip>
                        </CInputGroup>
                    </CCol>
                </CRow>

                {/* Sort and Filter Row */}
                <CRow className="mt-2">
                    <CCol xs={7}>
                        <CFormSelect
                            value={sortOption}
                            onChange={(e) => handleSortChange(e.target.value)}
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
                            onChange={(e) => handleFilterChange(e.target.value)}
                            aria-label="Filter By"
                        >
                            <option value="all">All Groups</option>
                            <option value="high-confidence">High Confidence</option>
                            <option value="low-confidence">Low Confidence</option>
                            <option value="large-groups">Large Groups (5+)</option>
                            <option value="small-groups">Small Groups (1-4)</option>
                            <option value="named">Named Groups</option>
                            <option value="unnamed">Unnamed Groups</option>
                        </CFormSelect>
                    </CCol>
                </CRow>

                {/* Enhanced Features Badge */}
                {(searchTerm || filterOption !== 'all') && (
                    <CRow className="mt-2">
                        <CCol>
                            <div className="d-flex align-items-center">
                                <small className="text-muted me-2">Active filters:</small>
                                {searchTerm && (
                                    <CBadge color="primary" className="me-2">
                                        Search: "{searchTerm}"
                                    </CBadge>
                                )}
                                {filterOption !== 'all' && (
                                    <CBadge color="info" className="me-2">
                                        Filter: {filterOption}
                                    </CBadge>
                                )}
                            </div>
                        </CCol>
                    </CRow>
                )}
            </CForm>
        </div>
    );
};

export default SearchAndFilterBar;
