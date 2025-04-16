import React from 'react'

// Views
const FaceSearch = React.lazy(() => import('./views/search/FaceSearch'))
const Detections = React.lazy(() => import('./views/theme/faces/Detections'))
const TopScoresView = React.lazy(() => import('./views/scores/TopScoresView'))

const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/search', name: 'Search', exact: true },
  { path: '/face-search', name: 'Search Faces', element: FaceSearch },
  { path: '/theme/faces', name: 'Faces', element: React.lazy(() => import('./views/theme/faces/faces')) },
  { path: '/scores/top-scores', name: 'Top Score Matches', element: TopScoresView }
]

export default routes
