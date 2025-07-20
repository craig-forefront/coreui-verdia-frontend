import React from 'react'

// Views
const FaceSearch = React.lazy(() => import('./views/search/FaceSearch'))
const Detections = React.lazy(() => import('./components/face/Detections'))
const ImageUploader = React.lazy(() => import('./components/face/ImageUploader'))
const ManualEmbedding = React.lazy(() => import('./components/face/ManualEmbedding'))
const TopScoresView = React.lazy(() => import('./views/scores/TopScoresView'))
const SearchHistoryView = React.lazy(() => import('./views/history/SearchHistoryView'))
const SystemStatus = React.lazy(() => import('./views/system/SystemStatus'))
const VideoUploader = React.lazy(() => import('./components/video/VideoUploader'))
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
  
  { path: '/components/face', name: 'Faces', exact: true, element: React.lazy(() => import('./components/face/Faces')) },
  { path: '/components/face/upload', name: 'Upload Face Image', element: ImageUploader },
  { path: '/components/face/detections', name: 'Face Detections', element: Detections },
  { path: '/components/face/manual-embedding', name: 'Manual Face Embedding', element: ManualEmbedding },
  { path: '/scores/top-scores', name: 'Top Score Matches', element: TopScoresView },
  { path: '/history/search', name: 'Search History', element: SearchHistoryView },
  { path: '/system/status', name: 'System Status', element: SystemStatus }
]

export default routes