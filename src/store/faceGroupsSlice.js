import { createSlice } from '@reduxjs/toolkit';

// Helper function to filter face groups based on criteria
const filterGroups = (groups, searchTerm, filterOption, quickFilters) => {
    let filtered = [...groups];

    // Apply search term filter
    if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter(group => {
            const name = (group.customName || `Group ${group.id}`).toLowerCase();
            return name.includes(searchLower);
        });
    }

    // Apply main filter option
    switch (filterOption) {
        case 'high-confidence':
            filtered = filtered.filter(group => group.confidence > 0.8);
            break;
        case 'low-confidence':
            filtered = filtered.filter(group => group.confidence <= 0.8);
            break;
        case 'large-groups':
            filtered = filtered.filter(group => group.face_count >= 5);
            break;
        case 'small-groups':
            filtered = filtered.filter(group => group.face_count < 5);
            break;
        case 'named':
            filtered = filtered.filter(group => group.customName && group.customName.trim());
            break;
        case 'unnamed':
            filtered = filtered.filter(group => !group.customName || !group.customName.trim());
            break;
        case 'all':
        default:
            // No additional filtering
            break;
    }

    // Apply quick filters
    quickFilters.forEach(filter => {
        if (!filter.active) return;

        switch (filter.type) {
            case 'confidence':
                if (filter.value === 'high') {
                    filtered = filtered.filter(group => group.confidence > 0.8);
                } else if (filter.value === 'low') {
                    filtered = filtered.filter(group => group.confidence <= 0.8);
                }
                break;
            case 'size':
                if (filter.value === 'large') {
                    filtered = filtered.filter(group => group.face_count >= 5);
                } else if (filter.value === 'small') {
                    filtered = filtered.filter(group => group.face_count < 5);
                }
                break;
            case 'status':
                if (filter.value === 'named') {
                    filtered = filtered.filter(group => group.customName && group.customName.trim());
                } else if (filter.value === 'unnamed') {
                    filtered = filtered.filter(group => !group.customName || !group.customName.trim());
                }
                break;
            default:
                break;
        }
    });

    return filtered;
};

// Helper function to sort face groups
const sortGroups = (groups, sortOption) => {
    const sorted = [...groups];

    switch (sortOption) {
        case 'name-asc':
            return sorted.sort((a, b) => 
                (a.customName || `Group ${a.id}`).localeCompare(b.customName || `Group ${b.id}`)
            );
        case 'name-desc':
            return sorted.sort((a, b) => 
                (b.customName || `Group ${b.id}`).localeCompare(a.customName || `Group ${a.id}`)
            );
        case 'count-asc':
            return sorted.sort((a, b) => a.face_count - b.face_count);
        case 'count-desc':
            return sorted.sort((a, b) => b.face_count - a.face_count);
        case 'confidence-asc':
            return sorted.sort((a, b) => a.confidence - b.confidence);
        case 'confidence-desc':
            return sorted.sort((a, b) => b.confidence - a.confidence);
        case 'default':
        default:
            return sorted; // Maintain original order
    }
};

const initialState = {
    // Search and filter state
    searchTerm: '',
    sortOption: 'default',
    filterOption: 'all',
    
    // Search history
    searchHistory: [],
    
    // Quick filters
    quickFilters: [
        { type: 'confidence', value: 'high', active: false },
        { type: 'confidence', value: 'low', active: false },
        { type: 'size', value: 'large', active: false },
        { type: 'size', value: 'small', active: false },
        { type: 'status', value: 'named', active: false },
        { type: 'status', value: 'unnamed', active: false }
    ],
    
    // Face groups data (this will come from the video slice but we cache filtered results)
    allGroups: [],
    filteredGroups: [],
    
    // UI state
    isSearching: false,
    lastSearchTime: null,
    
    // Statistics
    totalGroupsCount: 0,
    filteredGroupsCount: 0
};

const faceGroupsSlice = createSlice({
    name: 'faceGroups',
    initialState,
    reducers: {
        // Search actions
        setSearchTerm: (state, action) => {
            state.searchTerm = action.payload;
            state.isSearching = action.payload.length > 0;
            state.lastSearchTime = Date.now();
            
            // Recalculate filtered groups
            const filtered = filterGroups(
                state.allGroups, 
                action.payload, 
                state.filterOption, 
                state.quickFilters
            );
            state.filteredGroups = sortGroups(filtered, state.sortOption);
            state.filteredGroupsCount = state.filteredGroups.length;
        },

        // Sort actions
        setSortOption: (state, action) => {
            state.sortOption = action.payload;
            
            // Re-sort current filtered results
            state.filteredGroups = sortGroups(state.filteredGroups, action.payload);
        },

        // Filter actions
        setFilterOption: (state, action) => {
            state.filterOption = action.payload;
            
            // Recalculate filtered groups
            const filtered = filterGroups(
                state.allGroups, 
                state.searchTerm, 
                action.payload, 
                state.quickFilters
            );
            state.filteredGroups = sortGroups(filtered, state.sortOption);
            state.filteredGroupsCount = state.filteredGroups.length;
        },

        // Quick filter actions
        setQuickFilter: (state, action) => {
            const { type, value, active } = action.payload;
            
            // Update the specific quick filter
            const filterIndex = state.quickFilters.findIndex(
                f => f.type === type && f.value === value
            );
            
            if (filterIndex !== -1) {
                state.quickFilters[filterIndex].active = active;
                
                // Recalculate filtered groups
                const filtered = filterGroups(
                    state.allGroups, 
                    state.searchTerm, 
                    state.filterOption, 
                    state.quickFilters
                );
                state.filteredGroups = sortGroups(filtered, state.sortOption);
                state.filteredGroupsCount = state.filteredGroups.length;
            }
        },

        // Clear all filters and search
        clearSearch: (state) => {
            state.searchTerm = '';
            state.filterOption = 'all';
            state.isSearching = false;
            
            // Clear quick filters
            state.quickFilters.forEach(filter => {
                filter.active = false;
            });
            
            // Reset to all groups
            state.filteredGroups = sortGroups(state.allGroups, state.sortOption);
            state.filteredGroupsCount = state.filteredGroups.length;
        },

        // Search history management
        addSearchToHistory: (state, action) => {
            const { term, timestamp, videoId, resultCount } = action.payload;
            
            // Remove duplicate if exists
            state.searchHistory = state.searchHistory.filter(item => item.term !== term);
            
            // Add to beginning of history
            state.searchHistory.unshift({
                term,
                timestamp,
                videoId,
                resultCount
            });
            
            // Limit history size (max 20 items)
            if (state.searchHistory.length > 20) {
                state.searchHistory = state.searchHistory.slice(0, 20);
            }
        },

        clearSearchHistory: (state) => {
            state.searchHistory = [];
        },

        // Face groups data management
        setAllGroups: (state, action) => {
            state.allGroups = action.payload;
            state.totalGroupsCount = action.payload.length;
            
            // Recalculate filtered groups
            const filtered = filterGroups(
                action.payload, 
                state.searchTerm, 
                state.filterOption, 
                state.quickFilters
            );
            state.filteredGroups = sortGroups(filtered, state.sortOption);
            state.filteredGroupsCount = state.filteredGroups.length;
        },

        updateGroupInResults: (state, action) => {
            const { groupId, updates } = action.payload;
            
            // Update in all groups
            const allGroupIndex = state.allGroups.findIndex(g => g.id === groupId);
            if (allGroupIndex !== -1) {
                state.allGroups[allGroupIndex] = { ...state.allGroups[allGroupIndex], ...updates };
            }
            
            // Update in filtered groups
            const filteredGroupIndex = state.filteredGroups.findIndex(g => g.id === groupId);
            if (filteredGroupIndex !== -1) {
                state.filteredGroups[filteredGroupIndex] = { ...state.filteredGroups[filteredGroupIndex], ...updates };
            }
        },

        // Reset state for new video
        resetForNewVideo: (state) => {
            state.allGroups = [];
            state.filteredGroups = [];
            state.totalGroupsCount = 0;
            state.filteredGroupsCount = 0;
            state.searchTerm = '';
            state.filterOption = 'all';
            state.isSearching = false;
            
            // Reset quick filters
            state.quickFilters.forEach(filter => {
                filter.active = false;
            });
        }
    }
});

export const {
    setSearchTerm,
    setSortOption,
    setFilterOption,
    setQuickFilter,
    clearSearch,
    addSearchToHistory,
    clearSearchHistory,
    setAllGroups,
    updateGroupInResults,
    resetForNewVideo
} = faceGroupsSlice.actions;

// Selectors
export const selectSearchTerm = (state) => state.faceGroups.searchTerm;
export const selectSortOption = (state) => state.faceGroups.sortOption;
export const selectFilterOption = (state) => state.faceGroups.filterOption;
export const selectQuickFilters = (state) => state.faceGroups.quickFilters;
export const selectSearchHistory = (state) => state.faceGroups.searchHistory;
export const selectAllGroups = (state) => state.faceGroups.allGroups;
export const selectFilteredGroups = (state) => state.faceGroups.filteredGroups;
export const selectIsSearching = (state) => state.faceGroups.isSearching;
export const selectTotalGroupsCount = (state) => state.faceGroups.totalGroupsCount;
export const selectFilteredGroupsCount = (state) => state.faceGroups.filteredGroupsCount;
export const selectLastSearchTime = (state) => state.faceGroups.lastSearchTime;

// Computed selectors
export const selectHasActiveFilters = (state) => {
    const searchTerm = selectSearchTerm(state);
    const filterOption = selectFilterOption(state);
    const quickFilters = selectQuickFilters(state);
    
    return searchTerm.length > 0 || 
           filterOption !== 'all' || 
           quickFilters.some(f => f.active);
};

export const selectActiveQuickFilters = (state) => {
    return selectQuickFilters(state).filter(f => f.active);
};

export const selectSearchStats = (state) => {
    const totalCount = selectTotalGroupsCount(state);
    const filteredCount = selectFilteredGroupsCount(state);
    const hasFilters = selectHasActiveFilters(state);
    
    return {
        total: totalCount,
        filtered: filteredCount,
        hidden: totalCount - filteredCount,
        hasFilters,
        filterEfficiency: totalCount > 0 ? (filteredCount / totalCount) * 100 : 100
    };
};

export default faceGroupsSlice.reducer;
