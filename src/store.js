import { configureStore } from '@reduxjs/toolkit'
import vectorSearchReducer from './store/vectorSearchSlice'
import topScoresReducer from './store/topScoresSlice'

// Initial state for sidebar and theme
const initialState = {
  sidebarShow: true,
  theme: 'light',
}

// Initial state for banner
const initialStateBanner = {
  bannerText: 'MY//BANNER',
  bannerColor: 'bg-success',
}

// Reducer for sidebar and theme
const changeState = (state = initialState, { type, ...rest }) => {
  switch (type) {
    case 'set':
      return { ...state, ...rest }
    default:
      return state
  }
}

// Reducer for banner
const changeStateBanner = (state = initialStateBanner, action) => {
  switch (action.type) {
    case 'SET_BANNER_TEXT':
      return { ...state, bannerText: action.payload }
    case 'SET_BANNER_COLOR':
      return { ...state, bannerColor: action.payload }
    case 'UPDATE_BANNER':
      return { ...state, ...action.payload }
    default:
      return state
  }
}

// Create store with combined reducers
const store = configureStore({
  reducer: {
    vectorSearch: vectorSearchReducer,
    topScores: topScoresReducer,
    app: changeState,
    banner: changeStateBanner,
  },
})

export default store
