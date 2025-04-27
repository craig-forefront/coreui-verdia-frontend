import React from 'react';
import { useSelector } from 'react-redux';
import { CRow, CCol, CCard, CCardBody } from '@coreui/react';

const GroupedFacesPage = () => {
  const jobs = useSelector((state) => state.videoJobs.jobs);

  const allFaces = [];
  Object.values(jobs).forEach(job => {
    if (job.faces?.length) {
      allFaces.push(...job.faces);
    }
  });

  return (
    <div>
      <h3>Detected Faces</h3>
      <CRow>
        {allFaces.map((face, idx) => (
          <CCol key={idx} xs="6" md="3" className="mb-3">
            <img
              src={face.thumbnail_url}
              alt="face"
              style={{ width: "100%", borderRadius: "8px" }}
            />
          </CCol>
        ))}
      </CRow>
    </div>
  );
};

export default GroupedFacesPage;
