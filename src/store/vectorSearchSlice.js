import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { QdrantClient } from '@qdrant/js-client-rest'

const client = new QdrantClient({ url: 'http://localhost:6333' })

export const fetchVectorSearchResults = createAsyncThunk(
  'vectorSearch/fetchResults',
  async (vectors, { rejectWithValue }) => {
    try {
      const response = await client.search(
        'star_charts',{
        vector: vectors,
        limit: 3,
      })
      console.log('Search response:', response)
      if (!Array.isArray(response)) {
        throw new Error('Invalid response structure')
      }
      return response
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

const vectorSearchSlice = createSlice({
  name: 'vectorSearch',
  initialState: {
    results: [],
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchVectorSearchResults.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchVectorSearchResults.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.results = action.payload
      })
      .addCase(fetchVectorSearchResults.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })
  },
})

export default vectorSearchSlice.reducer