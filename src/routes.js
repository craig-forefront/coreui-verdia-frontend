import React from 'react'

// vectorSearch
const FaceSearch = React.lazy(() => import('./views/search/FaceSearch'))
const Detections = React.lazy(() => import('./views/theme/faces/Detections'))

const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/search', name: 'Search', exact: true },
  { path: '/face-search', name: 'Search Faces', element: FaceSearch },
  { path: '/theme/faces', name: 'Faces', element: React.lazy(() => import('./views/theme/faces/faces')) }
]

export default routes
