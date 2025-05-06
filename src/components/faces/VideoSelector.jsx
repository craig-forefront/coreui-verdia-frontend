import React from 'react';
import {
    CDropdown,
    CDropdownToggle,
    CDropdownMenu,
    CDropdownItem
} from '@coreui/react';

/**
 * Component for selecting a video from a dropdown list
 */
const VideoSelector = ({ videos, selectedVideoId, onSelectVideo }) => {
    const selectedVideo = selectedVideoId ? videos.find(video => video.id === selectedVideoId) : null;

    return (
        <CDropdown className="mb-3">
            <CDropdownToggle color="primary">
                {selectedVideo ?
                    `Video: ${selectedVideo.fileName || selectedVideo.id}` :
                    'Select a video'}
            </CDropdownToggle>
            <CDropdownMenu>
                {videos.map(video => (
                    <CDropdownItem
                        key={video.id}
                        onClick={() => onSelectVideo(video.id)}
                        active={video.id === selectedVideoId}
                    >
                        {video.fileName || video.id}
                    </CDropdownItem>
                ))}
            </CDropdownMenu>
        </CDropdown>
    );
};

export default VideoSelector;