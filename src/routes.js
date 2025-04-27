import React from 'react'

// Views
const FaceSearch = React.lazy(() => import('./views/search/FaceSearch'))
// Fix the extension from .jsx to .js (or ensure the file exists with .jsx extension)
const VideoFaceSearch = React.lazy(() => import('./views/video/SubmitVideosPage')) 
const Detections = React.lazy(() => import('./views/theme/faces/Detections'))
const TopScoresView = React.lazy(() => import('./views/scores/TopScoresView'))

const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/search', name: 'Search', exact: true },
  { path: '/face-search', name: 'Search Faces', element: FaceSearch },
  { path: '/face-search-video', name: 'Search Videos', element: VideoFaceSearch },
  { path: '/theme/faces', name: 'Faces', element: React.lazy(() => import('./views/theme/faces/faces')) },
  { path: '/scores/top-scores', name: 'Top Score Matches', element: TopScoresView }
]

export default routes
