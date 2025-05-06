import React from 'react'

// Views
const FaceSearch = React.lazy(() => import('./views/search/FaceSearch'))
const Detections = React.lazy(() => import('./views/theme/faces/Detections'))
const ImageUploader = React.lazy(() => import('./views/theme/faces/ImageUploader'))
const TopScoresView = React.lazy(() => import('./views/scores/TopScoresView'))
const VideoUploader = React.lazy(() => import('./components/VideoUploader'))
const FaceGroupings = React.lazy(() => import('./views/video/FaceGroupings'))

// Import MainVideoPage directly without lazy loading to prevent flickering during navigation
import MainVideoPage from './views/video/MainVideoPage'

const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/search', name: 'Search', exact: true },
  { path: '/face-search', name: 'Search Faces', element: FaceSearch },
  
  // Keep the existing face-search-video route for backward compatibility
  { path: '/face-search-video', name: 'Search Videos', element: MainVideoPage },
  { path: '/face-search-video/upload', name: 'Upload Video', element: MainVideoPage },
  { path: '/face-search-video/list', name: 'My Videos', element: MainVideoPage },
  { path: '/face-search-video/faces', name: 'Face Groups', element: MainVideoPage },
  
  // Main video route and its tab routes
  { path: '/videos', name: 'Videos', element: MainVideoPage },
  { path: '/videos/upload', name: 'Upload Video', element: MainVideoPage },
  { path: '/videos/list', name: 'My Videos', element: MainVideoPage },
  { path: '/videos/faces', name: 'Face Groups', element: MainVideoPage },
  
  { path: '/theme/faces', name: 'Faces', exact: true, element: React.lazy(() => import('./views/theme/faces/faces')) },
  { path: '/theme/faces/upload', name: 'Upload Face Image', element: ImageUploader },
  { path: '/theme/faces/detections', name: 'Face Detections', element: Detections },
  { path: '/scores/top-scores', name: 'Top Score Matches', element: TopScoresView }
]

export default routes