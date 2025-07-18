import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'

// Search history is on the veridra-backend (port 8000), not the face_video backend (port 8001)
const API_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:8000'

// API Key for authentication (consistent with other slices)
const API_KEY = import.meta.env.REACT_APP_API_KEY || "9W6MkcI1t5qMTJAMnZQBI82Eoc266mi9WKX1mmxnQlE"

// Async thunk for fetching search history
export const fetchSearchHistory = createAsyncThunk(
  'searchHistory/fetchSearchHistory',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { searchHistory } = getState()
      const { filters } = searchHistory
      
      const params = new URLSearchParams()
      if (filters.search_type) params.append('search_type', filters.search_type)
      if (filters.status) params.append('status', filters.status)
      if (filters.user_id) params.append('user_id', filters.user_id)
      params.append('page', filters.page.toString())
      params.append('page_size', filters.page_size.toString())
      
      const response = await axios.get(
        `${API_URL}/search-history?${params.toString()}`,
        { headers: { 'X-API-Key': API_KEY } }
      )
      
      return response.data
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail || 'Failed to fetch search history'
      )
    }
  }
)

// Async thunk for fetching search history detail
export const fetchSearchHistoryDetail = createAsyncThunk(
  'searchHistory/fetchSearchHistoryDetail',
  async (searchId, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}/search-history/${searchId}`,
        { headers: { 'X-API-Key': API_KEY } }
      )
      
      return response.data
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail || 'Failed to fetch search history detail'
      )
    }
  }
)

// Async thunk for deleting search history entry
export const deleteSearchHistoryEntry = createAsyncThunk(
  'searchHistory/deleteSearchHistoryEntry',
  async (searchId, { rejectWithValue }) => {
    try {
      const response = await axios.delete(
        `${API_URL}/search-history/${searchId}`,
        { headers: { 'X-API-Key': API_KEY } }
      )
      
      return { searchId, ...response.data }
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail || 'Failed to delete search history entry'
      )
    }
  }
)

// Async thunk for cleaning up old entries
export const cleanupOldEntries = createAsyncThunk(
  'searchHistory/cleanupOldEntries',
  async (daysOld = 30, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_URL}/search-history/cleanup?days_old=${daysOld}`,
        {},
        { headers: { 'X-API-Key': API_KEY } }
      )
      
      return response.data
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail || 'Failed to cleanup old entries'
      )
    }
  }
)

// Initial state
const initialState = {
  entries: [],
  totalCount: 0,
  loading: false,
  error: null,
  filters: {
    search_type: null,
    status: null,
    user_id: null,
    page: 1,
    page_size: 20,
    start_date: null,
    end_date: null
  },
  hasMore: false,
  selectedEntry: null,
  detailLoading: false,
  detailError: null
}

// Search history slice
const searchHistorySlice = createSlice({
  name: 'searchHistory',
  initialState,
  reducers: {
    // Update filters
    setHistoryFilters: (state, action) => {
      state.filters = {
        ...state.filters,
        ...action.payload
      }
      // Reset to page 1 when filters change (except for page changes)
      if (!action.payload.page) {
        state.filters.page = 1
      }
    },
    
    // Reset filters to default
    resetHistoryFilters: (state) => {
      state.filters = initialState.filters
    },
    
    // Clear all data
    clearSearchHistory: (state) => {
      state.entries = []
      state.totalCount = 0
      state.error = null
      state.selectedEntry = null
    },
    
    // Set selected entry for detail view
    setSelectedEntry: (state, action) => {
      state.selectedEntry = action.payload
    },
    
    // Clear error
    clearError: (state) => {
      state.error = null
      state.detailError = null
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch search history
      .addCase(fetchSearchHistory.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchSearchHistory.fulfilled, (state, action) => {
        state.loading = false
        state.entries = action.payload.entries
        state.totalCount = action.payload.total_count
        state.hasMore = action.payload.has_more
        state.error = null
      })
      .addCase(fetchSearchHistory.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      
      // Fetch search history detail
      .addCase(fetchSearchHistoryDetail.pending, (state) => {
        state.detailLoading = true
        state.detailError = null
      })
      .addCase(fetchSearchHistoryDetail.fulfilled, (state, action) => {
        state.detailLoading = false
        state.selectedEntry = action.payload
        state.detailError = null
      })
      .addCase(fetchSearchHistoryDetail.rejected, (state, action) => {
        state.detailLoading = false
        state.detailError = action.payload
      })
      
      // Delete search history entry
      .addCase(deleteSearchHistoryEntry.pending, (state) => {
        // Could add loading state for individual entries here
      })
      .addCase(deleteSearchHistoryEntry.fulfilled, (state, action) => {
        // Remove the deleted entry from the list
        state.entries = state.entries.filter(
          entry => entry.search_id !== action.payload.searchId
        )
        state.totalCount = Math.max(0, state.totalCount - 1)
      })
      .addCase(deleteSearchHistoryEntry.rejected, (state, action) => {
        state.error = action.payload
      })
      
      // Cleanup old entries
      .addCase(cleanupOldEntries.pending, (state) => {
        // Could add cleanup loading state here
      })
      .addCase(cleanupOldEntries.fulfilled, (state, action) => {
        // Could show success message or refresh data
        state.error = null
      })
      .addCase(cleanupOldEntries.rejected, (state, action) => {
        state.error = action.payload
      })
  }
})

// Export actions
export const {
  setHistoryFilters,
  resetHistoryFilters,
  clearSearchHistory,
  setSelectedEntry,
  clearError
} = searchHistorySlice.actions

// Export reducer
export default searchHistorySlice.reducer
