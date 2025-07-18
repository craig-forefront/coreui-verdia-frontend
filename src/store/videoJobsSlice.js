import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Fix for process.env not being defined
let API_BASE = "http://localhost:8000";
let API_KEY = import.meta.env.REACT_APP_API_KEY || import.meta.env.VITE_API_KEY;

try {
  // Try using process.env if available (typical CRA setup)
  if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) {
    API_BASE = process.env.REACT_APP_API_URL;
  } 
  // Fallback to window._env_ (used in some runtime env config solutions)
  else if (window._env_ && window._env_.REACT_APP_API_URL) {
    API_BASE = window._env_.REACT_APP_API_URL;
  }
} catch (e) {
  console.warn("Could not access environment variables, using default API URL");
}

export const submitVideos = createAsyncThunk('videoJobs/submitVideos', async (s3Paths) => {
  const response = await axios.post(`${API_BASE}/submit_videos`, { s3_video_paths: s3Paths }, {
    headers: {
      'X-API-Key': API_KEY
    }
  });
  return response.data.jobs;
});

export const fetchJobResults = createAsyncThunk('videoJobs/fetchJobResults', async (videoId) => {
  const response = await axios.get(`${API_BASE}/job_results/${videoId}`, {
    headers: {
      'X-API-Key': API_KEY
    }
  });
  return { videoId, faces: response.data };
});

const videoJobsSlice = createSlice({
  name: 'videoJobs',
  initialState: {
    jobs: {},
  },
  reducers: {
    updateJobStatus(state, action) {
      const { job_id, status, frames_processed } = action.payload;
      if (state.jobs[job_id]) {
        state.jobs[job_id].status = status;
        state.jobs[job_id].frames_processed = frames_processed;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitVideos.fulfilled, (state, action) => {
        action.payload.forEach(({ job_id, s3_video_path }) => {
          state.jobs[job_id] = { status: 'pending', faces: [], s3_video_path };
        });
      })
      .addCase(fetchJobResults.fulfilled, (state, action) => {
        const { videoId, faces } = action.payload;
        Object.values(state.jobs).forEach(job => {
          if (job.videoId === videoId) {
            job.faces = faces;
          }
        });
      });
  },
});

export const { updateJobStatus } = videoJobsSlice.actions;
export default videoJobsSlice.reducer;
