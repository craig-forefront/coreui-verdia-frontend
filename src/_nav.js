import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilPeople,
  cilChart,
  cilVideo,
  cilFace,
  cilHistory,
  cilSettings,
} from '@coreui/icons'
import { LucideIcon } from './components/ui/LucideIcon'
import { Images, ScanFace, Activity } from 'lucide-react'
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
    icon: <LucideIcon icon={ScanFace} to="/components/face/upload" />,
    name: 'Detect Faces',
    to: '/components/face/upload',
  },
  {
    component: CNavItem,
    icon: <CIcon icon={cilFace} customClassName="nav-icon" />,
    name: 'Manual Embedding',
    to: '/components/face/manual-embedding',
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
    icon: <CIcon icon={cilHistory} customClassName="nav-icon" />,
    name: 'Search History',
    to: '/history/search',
  },
  {
    component: CNavItem,
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
    name: 'Results',
    to: '/components/face/results',
  },
  {
    component: CNavTitle,
    name: 'Inbox',
  },
  {
    component: CNavTitle,
    name: 'Collections',
  },
  {
    component: CNavTitle,
    name: 'System',
  },
  {
    component: CNavItem,
    icon: <LucideIcon icon={Activity} to="/system/status" />,
    name: 'System Status',
    to: '/system/status',
  },
]

export default _nav
