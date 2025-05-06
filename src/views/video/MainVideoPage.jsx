import React, { useEffect } from 'react';
import VideoProcessingStatus from '../../components/VideoProcessingStatus';
import VideoUploader from '../../components/VideoUploader';
import FaceGroupings from './FaceGroupings';
import FaceGroupCard from '../../components/faces/FaceGroupCard';
import { useSelector, useDispatch } from 'react-redux';
import { cilCloudUpload, cilList, cilFace } from '@coreui/icons';
import CIcon from '@coreui/icons-react';
import { useLocation, NavLink, useNavigate } from 'react-router-dom';
import { CContainer, CRow, CCol, CCard, CCardHeader, CCardBody, CNav, CNavItem } from '@coreui/react';

const UploadPage = () => {
    return (
        <>
            <VideoUploader />
        </>
    );
};

const VideosPage = () => {
    const videos = useSelector((state) => state.video.videos);

    // Convert videos object to array and sort by upload time (newest first)
    const videoList = Object.values(videos || {}).sort((a, b) => {
        if (!a.uploadTime) return 1;
        if (!b.uploadTime) return -1;
        return new Date(b.uploadTime) - new Date(a.uploadTime);
    });

    return (
        <>
            {videoList.length === 0 ? (
                <div className="text-center py-5 text-muted">
                    <h5>No videos uploaded yet</h5>
                    <p>Upload a video to start processing</p>
                </div>
            ) : (
                videoList.map(video => (
                    video && video.id ? (
                        <VideoProcessingStatus key={video.id} videoId={video.id} />
                    ) : null
                ))
            )}
        </>
    );
};

const MainVideoPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const currentPath = location.pathname;
    
    // Check if we're on the face-search-video route or videos route
    const isFaceSearchVideoRoute = currentPath.includes('face-search-video');
    const baseRoute = isFaceSearchVideoRoute ? '/face-search-video' : '/videos';
    
    // If at the base route, redirect to the upload tab
    useEffect(() => {
        if (currentPath === '/videos' || currentPath === '/face-search-video') {
            navigate(`${baseRoute}/upload`, { replace: true });
        }
    }, [currentPath, baseRoute, navigate]);
    
    // Determine which component to show based on the current path
    let activeComponent;
    if (currentPath.includes('/list')) {
        activeComponent = <VideosPage />;
    } else if (currentPath.includes('/faces')) {
        activeComponent = <FaceGroupings />;
    } else if (currentPath.includes('/upload') || currentPath === '/videos' || currentPath === '/face-search-video') {
        activeComponent = <UploadPage />;
    } else {
        // Default to upload page for any other path
        activeComponent = <UploadPage />;
    }

    return (
        <div className="bg-body min-vh-100 d-flex flex-column align-items-center">
            <CContainer>
                <CRow className="justify-content-center">
                    <CCol xs={12} md={10} lg={8}>
                        <h1 className="mb-4 text-center text-primary">Face Detection Video Processing</h1>

                        <CCard className="mb-4">
                            <CCardHeader className="bg-transparent">
                                <CNav variant="tabs">
                                    <CNavItem>
                                        <NavLink 
                                            to={`${baseRoute}/upload`} 
                                            className={({ isActive }) => 
                                                `nav-link ${isActive || 
                                                    currentPath === baseRoute || 
                                                    (currentPath.includes('/upload')) ? 'active' : ''}`
                                            }
                                            end
                                        >
                                            <CIcon icon={cilCloudUpload} className="me-2" />
                                            Upload Video
                                        </NavLink>
                                    </CNavItem>
                                    <CNavItem>
                                        <NavLink 
                                            to={`${baseRoute}/list`} 
                                            className={({ isActive }) => 
                                                `nav-link ${isActive || currentPath.includes('/list') ? 'active' : ''}`
                                            }
                                        >
                                            <CIcon icon={cilList} className="me-2" />
                                            My Videos
                                            <VideoCounter />
                                        </NavLink>
                                    </CNavItem>
                                    <CNavItem>
                                        <NavLink 
                                            to={`${baseRoute}/faces`} 
                                            className={({ isActive }) => 
                                                `nav-link ${isActive || currentPath.includes('/faces') ? 'active' : ''}`
                                            }
                                        >
                                            <CIcon icon={cilFace} className="me-2" />
                                            Face Groups
                                            <FaceGroupCounter />
                                        </NavLink>
                                    </CNavItem>
                                </CNav>
                            </CCardHeader>
                            <CCardBody>
                                {activeComponent}
                            </CCardBody>
                        </CCard>
                    </CCol>
                </CRow>
            </CContainer>
        </div>
    );
};

// Separate component for the video counter badge
const VideoCounter = () => {
    const videos = useSelector((state) => state.video.videos);
    const videoCount = Object.keys(videos || {}).length;

    if (videoCount === 0) return null;

    return (
        <span className="ms-2 badge bg-primary rounded-pill">
            {videoCount}
        </span>
    );
};

// New component for the face groups counter badge
const FaceGroupCounter = () => {
    const videos = useSelector((state) => state.video.videos);
    
    // Count videos with completed face groups
    const completedVideosWithFaceGroups = Object.values(videos || {})
        .filter(video => video.status === 'completed' && video.faceGroups && video.faceGroups.length > 0);
    
    const groupCount = completedVideosWithFaceGroups.length;

    if (groupCount === 0) return null;

    return (
        <span className="ms-2 badge bg-primary rounded-pill">
            {groupCount}
        </span>
    );
};

// Export the main component as default
export default MainVideoPage;

// Export the individual tab components directly 
export const UploadVideoTab = MainVideoPage;
export const VideosListTab = MainVideoPage;
export const FaceGroupsTab = MainVideoPage;