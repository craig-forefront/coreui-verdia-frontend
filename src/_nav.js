import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilSearch,
  cilPeople,
} from '@coreui/icons'
import { CNavGroup, CNavItem, CNavTitle } from '@coreui/react'

const _nav = [
  {
    component: CNavTitle,
    name: 'Search',
  },
  {
    component: CNavItem,
    icon: <CIcon icon={cilSearch} customClassName="nav-icon" />,
    name: 'Search Faces',
    to: '/face-search',
  },
  {
    component: CNavTitle,
    name: 'Analyze',
  },
  {
    component: CNavItem,
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
    name: 'Compare Faces',
    to: '/face-search',
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
