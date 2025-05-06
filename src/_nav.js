import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilSearch,
  cilPeople,
  cilChart,
  cilVideo,
  cilFace,
} from '@coreui/icons'
import { LucideIcon } from './components/LucideIcon'
import { Images, ScanFace } from 'lucide-react'  // Add ScanFace icon for face detection
import { CNavGroup, CNavGroupItems, CNavItem, CNavTitle } from '@coreui/react'


const _nav = [
  {
    component: CNavTitle,
    name: 'Search',
  },
  {
    component: CNavItem,
    name: 'Images',
    to: '/face-search',
    icon: <LucideIcon icon={Images} to="/face-search" />,
  },
  {
    component: CNavItem,
    name: 'Videos',
    to: '/face-search-video',
    icon: <CIcon icon={cilVideo} customClassName="nav-icon" />,
  },
  {
    component: CNavTitle,
    name: 'Analyze',
  },
  {
    component: CNavItem,
    icon: <LucideIcon icon={ScanFace} to="/theme/faces/upload" />,
    name: 'Detect Faces',
    to: '/theme/faces/upload',
  },
  {
    component: CNavItem,
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
    name: 'Compare Faces',
    to: '/face-search',
  },
  {
    component: CNavItem,
    icon: <CIcon icon={cilChart} customClassName="nav-icon" />,
    name: 'Top Score Matches',
    to: '/scores/top-scores',
  },
  {
    component: CNavItem,
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
    name: 'Results',
    to: '/theme/faces',
  },
  {
    component: CNavTitle,
    name: 'Inbox',
  },
  {
    component: CNavTitle,
    name: 'Collections',
  },
]

export default _nav
