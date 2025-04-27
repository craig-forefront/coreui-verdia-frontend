import React from 'react';
import { useSelector } from 'react-redux';
import { CCard, CCardBody } from '@coreui/react';
import useWebSocket from '../hooks/useWebSocket';

const JobStatusPage = () => {
  useWebSocket();
  const jobs = useSelector((state) => state.videoJobs.jobs);

  return (
    <div>
      <h3>Jobs</h3>
      {Object.entries(jobs).map(([jobId, job]) => (
        <CCard key={jobId} className="mb-3">
          <CCardBody>
            <strong>Job ID:</strong> {jobId} <br />
            <strong>Status:</strong> {job.status} <br />
            <strong>Frames Processed:</strong> {job.frames_processed || 0}
          </CCardBody>
        </CCard>
      ))}
    </div>
  );
};

export default JobStatusPage;
