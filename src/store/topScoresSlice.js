import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'

// Base API URL for backend requests
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// API Key for authentication
const API_KEY = "9W6MkcI1t5qMTJAMnZQBI82Eoc266mi9WKX1mmxnQlE"

// Thunk for fetching top scores with filters
export const fetchTopScores = createAsyncThunk(
  'topScores/fetch',
  async (filters, { rejectWithValue, getState }) => {
    try {
      // Add isLoadingMore flag to track pagination requests
      const isLoadingMore = filters.isLoadingMore || false;
      
      const response = await axios.post(`${API_BASE_URL}/search/top-scores`, {
        threshold: filters.threshold || null,
        sex: filters.sex || null,
        age_range: filters.minAge && filters.maxAge ? [Number(filters.minAge), Number(filters.maxAge)] : null,
        limit: filters.limit || 10,
        offset: filters.offset || 0
      }, {
        // Add API key header for authentication
        headers: {
          'X-API-Key': API_KEY
        }
      })
      
      return { data: response.data, isLoadingMore }
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch top scores')
    }
  }
)

// Initial state
const initialState = {
  results: [],
  totalCount: 0,
  hasMore: false,
  status: 'idle',
  error: null,
  filters: {
    threshold: 0.7,
    sex: '',
    minAge: '',
    maxAge: '',
    limit: 10,
    offset: 0
  }
}

// The slice
const topScoresSlice = createSlice({
  name: 'topScores',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      // Only reset offset if explicitly instructed or when changing filter criteria
      if (action.payload.resetOffset) {
        state.filters = {
          ...state.filters,
          ...action.payload,
          offset: 0
        };
      } else {
        state.filters = {
          ...state.filters,
          ...action.payload
        };
      }
    },
    incrementOffset: (state) => {
      state.filters.offset += state.filters.limit
    },
    resetFilters: (state) => {
      state.filters = initialState.filters
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTopScores.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchTopScores.fulfilled, (state, action) => {
        state.status = 'succeeded'
        
        // Check if loading more (pagination) or new search
        if (action.payload.isLoadingMore) {
          // Append results for pagination
          state.results = [...state.results, ...action.payload.data.results]
        } else {
          // Replace results for new search
          state.results = action.payload.data.results
        }
        
        state.totalCount = action.payload.data.total_count
        state.hasMore = action.payload.data.has_more
      })
      .addCase(fetchTopScores.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || 'Unknown error occurred'
      })
  }
})

// Export actions and reducer
export const { setFilters, incrementOffset, resetFilters } = topScoresSlice.actions
export default topScoresSlice.reducer