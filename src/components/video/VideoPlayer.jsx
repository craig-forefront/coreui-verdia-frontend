import React, { useRef } from 'react';
import { CCard, CCardBody } from '@coreui/react';

const VideoPlayer = ({ videoUrl, seekTime }) => {
  const videoRef = useRef();

  const seekTo = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  };

  return (
    <CCard className="mb-4">
      <CCardBody>
        <video ref={videoRef} src={videoUrl} width="100%" controls />
      </CCardBody>
    </CCard>
  );
};

export default VideoPlayer;
