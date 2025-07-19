import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { 
  PRIMARY_API_BASE_URL, 
  API_KEY, 
  API_ENDPOINTS 
} from '../config/api.js';

export const submitVideos = createAsyncThunk('videoJobs/submitVideos', async (s3Paths) => {
  const response = await axios.post(`${PRIMARY_API_BASE_URL}${API_ENDPOINTS.PRIMARY.ENDPOINTS.VIDEO_JOBS}`, { s3_video_paths: s3Paths }, {
    headers: {
      'X-API-Key': API_KEY
    }
  });
  return response.data.jobs;
});

export const fetchJobResults = createAsyncThunk('videoJobs/fetchJobResults', async (videoId) => {
  const response = await axios.get(`${PRIMARY_API_BASE_URL}/job_results/${videoId}`, {
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
