import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CCard,
  CCardBody,
  CRow,
  CCol,
  CButton,
  CAlert,
  CFormCheck,
  CBadge,
  CButtonGroup,
} from '@coreui/react'

// Redux imports
import {
  setCurrentImage,
  clearCurrentImage,
  setManualBbox,
  addKeyPoint,
  removeLastKeyPoint,
  clearKeyPoints,
  setIsDrawing,
  setIsMarkingKeyPoints,
  generateEmbedding,
  setError,
  clearError,
  clearResults,
  selectCurrentImage,
  selectManualBbox,
  selectManualKeyPoints,
  selectIsDrawing,
  selectIsMarkingKeyPoints,
  selectIsDetecting,
  selectIsGeneratingEmbedding,
  selectEmbeddingResults,
  selectError,
  selectSuccess,
} from '../../store/faceProcessingSlice'

import useLocalStorage from '../../hooks/useLocalStorage'
import './manual-embedding.css'

const ManualEmbeddingModal = ({
  visible,
  onClose,
  imageData,
  existingDetections = [],
  onDetectionsUpdate,
}) => {
  const dispatch = useDispatch()

  // Redux state selectors
  const currentImage = useSelector(selectCurrentImage)
  const manualBbox = useSelector(selectManualBbox)
  const manualKeyPoints = useSelector(selectManualKeyPoints)
  const isDrawing = useSelector(selectIsDrawing)
  const isMarkingKeyPoints = useSelector(selectIsMarkingKeyPoints)
  const isDetecting = useSelector(selectIsDetecting)
  const isGeneratingEmbedding = useSelector(selectIsGeneratingEmbedding)
  const embeddingResults = useSelector(selectEmbeddingResults)
  const error = useSelector(selectError)
  const success = useSelector(selectSuccess)

  // Local state for drawing (must be before callbacks that use them)
  const [drawingStart, setDrawingStart] = useState(null)
  const [currentBbox, setCurrentBbox] = useState(null)
  const [newDetections, setNewDetections] = useState([])
  const [zoomLevel, setZoomLevel] = useState(1) // Add zoom state
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0, visible: false })
  const [isBboxDrawingEnabled, setIsBboxDrawingEnabled] = useState(false)
  const [pointSizeMultiplier, setPointSizeMultiplier] = useState(1.0) // Add point size adjuster
  
  // Resize state
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState(null) // 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'
  const [resizeStart, setResizeStart] = useState(null)
  const [originalBbox, setOriginalBbox] = useState(null)
  const [hoverHandle, setHoverHandle] = useState(null) // Track which handle is being hovered
  const resizeAnimationRef = useRef(null) // For requestAnimationFrame

  // Image panning state
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [lastPanPosition, setLastPanPosition] = useState({ x: 0, y: 0 })

  // Local preferences with localStorage
  const [localPrefs, setLocalPrefs] = useLocalStorage('manualEmbeddingModalPrefs', {
    showExistingDetections: true,
  })

  // Refs for canvas operations
  const canvasRef = useRef(null)
  const imageRef = useRef(null)

  // Initialize image data when modal opens
  useEffect(() => {
    console.log('Modal visibility changed:', visible)
    console.log('Image data received:', imageData)

    if (visible && imageData && imageData.url) {
      console.log('Setting current image with URL:', imageData.url)

      // Always start at 100% zoom (original pixel size)
      setZoomLevel(1)
      console.log('Setting initial zoom to 100% (original pixel size):', imageData.imageSize)

      // Convert imageData to the format expected by the component
      dispatch(
        setCurrentImage({
          file: null, // We don't have the original file
          preview: imageData.url,
          dimensions: {
            width: imageData.imageSize?.[0] || 1920,
            height: imageData.imageSize?.[1] || 1080,
          },
          originalFile: null,
        }),
      )
    } else if (visible && !imageData?.url) {
      console.warn('Modal opened but no image URL found in imageData:', imageData)
    }
  }, [visible, imageData, dispatch]) // Removed currentImage dependency to avoid loops

  // Clear state when modal closes
  useEffect(() => {
    if (!visible) {
      dispatch(clearCurrentImage())
      dispatch(clearResults())
      dispatch(clearError())
      dispatch(setIsDrawing(false))
      dispatch(setIsMarkingKeyPoints(false))
      dispatch(setManualBbox(null))
      dispatch(clearKeyPoints())
      setDrawingStart(null)
      setCurrentBbox(null)
      setNewDetections([])
      setIsBboxDrawingEnabled(false)
      setPointSizeMultiplier(1.0) // Reset point size to default
      // Reset image panning
      setImagePosition({ x: 0, y: 0 })
      setIsPanning(false)
      setPanStart({ x: 0, y: 0 })
      setLastPanPosition({ x: 0, y: 0 })
      // Reset resize state
      setIsResizing(false)
      setResizeHandle(null)
      setResizeStart(null)
      setOriginalBbox(null)
      if (resizeAnimationRef.current) {
        cancelAnimationFrame(resizeAnimationRef.current)
        resizeAnimationRef.current = null
      }
    }
  }, [visible, dispatch])

  // Image panning handlers
  const handleImageMouseDown = useCallback(
    (e) => {
      // Only start panning if we're not in a drawing or keypoint mode
      // and if it's the primary mouse button (left click)
      if (e.button === 0 && !isBboxDrawingEnabled && !isMarkingKeyPoints && !isDrawing) {
        console.log('🖱️ Starting image pan')
        setIsPanning(true)
        setPanStart({ x: e.clientX, y: e.clientY })
        setLastPanPosition(imagePosition)
        e.preventDefault()
        e.stopPropagation()
      }
    },
    [isBboxDrawingEnabled, isMarkingKeyPoints, isDrawing, imagePosition],
  )

  const handleImageMouseMove = useCallback(
    (e) => {
      if (isPanning) {
        const deltaX = e.clientX - panStart.x
        const deltaY = e.clientY - panStart.y

        setImagePosition({
          x: lastPanPosition.x + deltaX,
          y: lastPanPosition.y + deltaY,
        })

        e.preventDefault()
        e.stopPropagation()
      }
    },
    [isPanning, panStart, lastPanPosition],
  )

  const handleImageMouseUp = useCallback(
    (e) => {
      if (isPanning) {
        console.log('🖱️ Ending image pan')
        setIsPanning(false)
        e.preventDefault()
        e.stopPropagation()
      }
    },
    [isPanning],
  )

  const handleImageMouseLeave = useCallback(() => {
    if (isPanning) {
      console.log('🖱️ Mouse left image area, ending pan')
      setIsPanning(false)
    }
  }, [isPanning])

  // Reset image position when zoom changes significantly
  const handleResetImagePosition = useCallback(() => {
    setImagePosition({ x: 0, y: 0 })
  }, [])

  // Mouse wheel zoom handler
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      // Only zoom with Ctrl/Cmd + wheel
      e.preventDefault()
      const zoomFactor = 0.1
      const delta = e.deltaY > 0 ? -zoomFactor : zoomFactor
      setZoomLevel((prev) => Math.max(0.25, Math.min(4, prev + delta))) // Max zoom 400%
    }
  }, [])

  // Function to get dynamic cursor label sizes based on image and bbox size
  const getCursorLabelStyles = useCallback(() => {
    const img = imageRef.current
    let scaleFactor = 1

    if (img) {
      const imgRect = img.getBoundingClientRect()
      const imageDisplaySize = Math.min(imgRect.width, imgRect.height)
      const isSmallImage = imgRect.width < 400 || imgRect.height < 400
      const isVerySmallImage = imgRect.width < 200 || imgRect.height < 200

      if (manualBbox) {
        // Use bounding box size for more precise scaling
        const bboxDisplaySize = Math.min(manualBbox.width, manualBbox.height)
        scaleFactor = Math.sqrt(bboxDisplaySize / 50) // Balanced scaling
      } else {
        // Fallback to image size with balanced scaling
        scaleFactor = Math.sqrt(imageDisplaySize / 180) // Balanced sensitivity
      }

      // Better treatment for different image sizes
      if (isVerySmallImage) {
        scaleFactor = Math.max(0.4, scaleFactor * 0.7) // Much smaller for very small images
      } else if (isSmallImage) {
        scaleFactor = Math.max(0.6, scaleFactor * 0.85) // Smaller for small images
      }
    }

    // Apply zoom level
    scaleFactor *= zoomLevel

    // More conservative range for cursor labels with smaller text
    scaleFactor = Math.max(0.4, Math.min(2.0, scaleFactor))

    return {
      fontSize: Math.round(8 * scaleFactor), // Reduced from 10 for smaller crosshair text
      counterFontSize: Math.round(6 * scaleFactor), // Reduced from 8 for smaller counter
      padding: `${Math.round(2 * scaleFactor)}px ${Math.round(4 * scaleFactor)}px`, // Reduced padding
      borderRadius: `${Math.round(2 * scaleFactor)}px`, // Reduced border radius
    }
  }, [manualBbox, zoomLevel])

  // Canvas drawing functions
  const getCanvasCoordinates = useCallback((e) => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return { x: 0, y: 0 }

    const canvasRect = canvas.getBoundingClientRect()
    const imgRect = img.getBoundingClientRect()

    // Calculate the mouse position relative to the image (not the canvas container)
    const displayX = e.clientX - imgRect.left
    const displayY = e.clientY - imgRect.top

    // Check if click is within the image bounds
    if (displayX < 0 || displayY < 0 || displayX > imgRect.width || displayY > imgRect.height) {
      console.log('Click outside image bounds')
      return null
    }

    // Convert from displayed image coordinates to natural image coordinates
    const scaleX = canvas.width / imgRect.width
    const scaleY = canvas.height / imgRect.height

    const coords = {
      x: Math.round(displayX * scaleX * 100) / 100, // Round to 2 decimal places for stability
      y: Math.round(displayY * scaleY * 100) / 100,
    }

    return coords
  }, [])

  // Debounced resize function to reduce jitter
  const updateBboxDuringResize = useCallback((newBbox) => {
    if (resizeAnimationRef.current) {
      cancelAnimationFrame(resizeAnimationRef.current)
    }
    
    resizeAnimationRef.current = requestAnimationFrame(() => {
      dispatch(setManualBbox(newBbox))
    })
  }, [dispatch])

  // Helper function to get resize handle at coordinates
  const getResizeHandle = useCallback((coords, bbox) => {
    if (!bbox) return null
    
    const handleSize = 16 // Increased size of resize handles in canvas coordinates
    const tolerance = handleSize / 2
    
    const left = bbox.x
    const right = bbox.x + bbox.width
    const top = bbox.y
    const bottom = bbox.y + bbox.height
    const centerX = bbox.x + bbox.width / 2
    const centerY = bbox.y + bbox.height / 2
    
    // Check corner handles first (higher priority)
    if (Math.abs(coords.x - left) <= tolerance && Math.abs(coords.y - top) <= tolerance) {
      return 'nw' // Northwest
    }
    if (Math.abs(coords.x - right) <= tolerance && Math.abs(coords.y - top) <= tolerance) {
      return 'ne' // Northeast
    }
    if (Math.abs(coords.x - left) <= tolerance && Math.abs(coords.y - bottom) <= tolerance) {
      return 'sw' // Southwest
    }
    if (Math.abs(coords.x - right) <= tolerance && Math.abs(coords.y - bottom) <= tolerance) {
      return 'se' // Southeast
    }
    
    // Check edge handles
    if (Math.abs(coords.x - centerX) <= tolerance && Math.abs(coords.y - top) <= tolerance) {
      return 'n' // North
    }
    if (Math.abs(coords.x - centerX) <= tolerance && Math.abs(coords.y - bottom) <= tolerance) {
      return 's' // South
    }
    if (Math.abs(coords.x - left) <= tolerance && Math.abs(coords.y - centerY) <= tolerance) {
      return 'w' // West
    }
    if (Math.abs(coords.x - right) <= tolerance && Math.abs(coords.y - centerY) <= tolerance) {
      return 'e' // East
    }
    
    return null
  }, [])

  // Helper function to get cursor style for resize handle
  const getCursorForHandle = useCallback((handle) => {
    switch (handle) {
      case 'nw':
      case 'se':
        return 'nw-resize'
      case 'ne':
      case 'sw':
        return 'ne-resize'
      case 'n':
      case 's':
        return 'ns-resize'
      case 'e':
      case 'w':
        return 'ew-resize'
      default:
        return 'grab'
    }
  }, [])

  // Canvas event handlers using Redux actions
  const handleCanvasMouseDown = useCallback(
    (e) => {
      console.log('🔥 MOUSE DOWN EVENT TRIGGERED!', {
        isMarkingKeyPoints,
        isBboxDrawingEnabled,
        manualBbox: !!manualBbox,
        target: e.target.tagName,
        button: e.button,
      })

      e.preventDefault()
      e.stopPropagation()

      const coords = getCanvasCoordinates(e)
      if (!coords) {
        console.log('❌ Click outside image area')
        return
      }

      console.log('✅ Valid coordinates:', coords)

      // Priority 1: Check for resize handles if we have a manual bbox
      if (manualBbox && !isBboxDrawingEnabled && !isMarkingKeyPoints) {
        const handle = getResizeHandle(coords, manualBbox)
        if (handle) {
          console.log('🔧 Starting resize with handle:', handle)
          setIsResizing(true)
          setResizeHandle(handle)
          setResizeStart(coords)
          setOriginalBbox({ ...manualBbox })
          return
        }
      }

      // Priority 2: Bounding box drawing when explicitly enabled
      if (isBboxDrawingEnabled && !manualBbox) {
        console.log('🎯 STARTING BBOX DRAWING!')
        dispatch(setIsDrawing(true))
        setDrawingStart(coords)
      } else if (isMarkingKeyPoints && manualBbox) {
        console.log('In keypoint marking mode')
        // Check if we already have 5 keypoints
        if (manualKeyPoints.length >= 5) {
          console.warn('Maximum of 5 keypoints allowed per bounding box')
          return
        }

        // Check if the click is within the bounding box
        const withinBbox =
          coords.x >= manualBbox.x &&
          coords.x <= manualBbox.x + manualBbox.width &&
          coords.y >= manualBbox.y &&
          coords.y <= manualBbox.y + manualBbox.height

        if (!withinBbox) {
          console.warn('Keypoints must be placed within the bounding box')
          return
        }

        // Add key point with proper face landmark labels
        const landmarkTypes = ['left_eye', 'right_eye', 'nose', 'mouth_left', 'mouth_right']
        const pointType = landmarkTypes[manualKeyPoints.length]

        dispatch(
          addKeyPoint({
            x: coords.x,
            y: coords.y,
            type: pointType,
          }),
        )
      } else if (isMarkingKeyPoints && !manualBbox) {
        console.warn('Please draw a bounding box before marking keypoints')
      } else {
        console.log('❌ No drawing mode enabled or invalid state:', {
          isBboxDrawingEnabled,
          hasManualBbox: !!manualBbox,
          isMarkingKeyPoints,
        })
      }
    },
    [
      dispatch,
      getCanvasCoordinates,
      isMarkingKeyPoints,
      manualKeyPoints.length,
      manualBbox,
      isBboxDrawingEnabled,
    ],
  )

  const handleCanvasMouseMove = useCallback(
    (e) => {
      e.preventDefault()

      // Update cursor position for label - use viewport coordinates
      if (isMarkingKeyPoints && manualBbox) {
        setCursorPosition({
          x: e.clientX,
          y: e.clientY,
          visible: true,
        })
      }

      const coords = getCanvasCoordinates(e)
      
      // Check for hover over resize handles when we have a manual bbox and not in other modes
      if (manualBbox && !isBboxDrawingEnabled && !isMarkingKeyPoints && !isDrawing && !isResizing) {
        const handle = getResizeHandle(coords, manualBbox)
        setHoverHandle(handle)
      } else {
        setHoverHandle(null)
      }
      
      // Handle resizing
      if (isResizing && resizeHandle && resizeStart && originalBbox) {
        const deltaX = coords.x - resizeStart.x
        const deltaY = coords.y - resizeStart.y
        
        let newBbox = { ...originalBbox }
        
        switch (resizeHandle) {
          case 'nw':
            newBbox.x = Math.round(originalBbox.x + deltaX)
            newBbox.y = Math.round(originalBbox.y + deltaY)
            newBbox.width = Math.round(originalBbox.width - deltaX)
            newBbox.height = Math.round(originalBbox.height - deltaY)
            break
          case 'ne':
            newBbox.y = Math.round(originalBbox.y + deltaY)
            newBbox.width = Math.round(originalBbox.width + deltaX)
            newBbox.height = Math.round(originalBbox.height - deltaY)
            break
          case 'sw':
            newBbox.x = Math.round(originalBbox.x + deltaX)
            newBbox.width = Math.round(originalBbox.width - deltaX)
            newBbox.height = Math.round(originalBbox.height + deltaY)
            break
          case 'se':
            newBbox.width = Math.round(originalBbox.width + deltaX)
            newBbox.height = Math.round(originalBbox.height + deltaY)
            break
          case 'n':
            newBbox.y = Math.round(originalBbox.y + deltaY)
            newBbox.height = Math.round(originalBbox.height - deltaY)
            break
          case 's':
            newBbox.height = Math.round(originalBbox.height + deltaY)
            break
          case 'w':
            newBbox.x = Math.round(originalBbox.x + deltaX)
            newBbox.width = Math.round(originalBbox.width - deltaX)
            break
          case 'e':
            newBbox.width = Math.round(originalBbox.width + deltaX)
            break
        }
        
        // Ensure minimum size
        const minSize = 20
        if (newBbox.width < minSize) {
          if (resizeHandle.includes('w')) {
            newBbox.x = Math.round(originalBbox.x + originalBbox.width - minSize)
          }
          newBbox.width = minSize
        }
        if (newBbox.height < minSize) {
          if (resizeHandle.includes('n')) {
            newBbox.y = Math.round(originalBbox.y + originalBbox.height - minSize)
          }
          newBbox.height = minSize
        }
        
        // Ensure coordinates are within bounds (if image dimensions are available)
        const canvas = canvasRef.current
        if (canvas) {
          newBbox.x = Math.max(0, Math.min(newBbox.x, canvas.width - newBbox.width))
          newBbox.y = Math.max(0, Math.min(newBbox.y, canvas.height - newBbox.height))
        }
        
        updateBboxDuringResize(newBbox)
        return
      }

      if (!isDrawing || !drawingStart) return

      const currentBox = {
        x: Math.min(drawingStart.x, coords.x),
        y: Math.min(drawingStart.y, coords.y),
        width: Math.abs(coords.x - drawingStart.x),
        height: Math.abs(coords.y - drawingStart.y),
      }

      console.log('Mouse move - drawing box:', { currentBox, isDrawing, drawingStart })

      // Update preview box (local state for smooth drawing)
      setCurrentBbox(currentBox)
    },
    [isDrawing, drawingStart, getCanvasCoordinates, isMarkingKeyPoints, manualBbox, isResizing, resizeHandle, resizeStart, originalBbox, updateBboxDuringResize],
  )

  const handleCanvasMouseUp = useCallback(
    (e) => {
      e.preventDefault()
      
      // Handle resize end
      if (isResizing) {
        console.log('Ending resize')
        if (resizeAnimationRef.current) {
          cancelAnimationFrame(resizeAnimationRef.current)
          resizeAnimationRef.current = null
        }
        setIsResizing(false)
        setResizeHandle(null)
        setResizeStart(null)
        setOriginalBbox(null)
        return
      }
      
      console.log('Mouse up:', { isDrawing, currentBbox })
      if (isDrawing && currentBbox) {
        console.log('Setting manual bbox:', currentBbox)
        dispatch(setManualBbox(currentBbox))
        dispatch(setIsDrawing(false))
        setDrawingStart(null)
        setCurrentBbox(null)
        // Auto-disable drawing mode after completing a box
        setIsBboxDrawingEnabled(false)
      }
    },
    [dispatch, isDrawing, currentBbox, isResizing],
  )

  // Mouse enter/leave handlers for cursor label
  const handleCanvasMouseEnter = useCallback(() => {
    if (isMarkingKeyPoints && manualBbox) {
      setCursorPosition((prev) => ({ ...prev, visible: true }))
    }
  }, [isMarkingKeyPoints, manualBbox])

  const handleCanvasMouseLeave = useCallback(() => {
    setCursorPosition((prev) => ({ ...prev, visible: false }))
    setHoverHandle(null)
  }, [])

  // Canvas drawing helper functions
  const drawBoundingBox = useCallback(
    (ctx, bbox, color, canvasWidth, canvasHeight) => {
      if (!bbox || !ctx) {
        console.warn('Missing bbox or context for drawing:', { bbox, ctx })
        return
      }

      console.log('Drawing bounding box:', { bbox, color, canvasWidth, canvasHeight })

      // Calculate line width based on image size and zoom
      const img = imageRef.current
      let lineWidth = 3 // Default

      if (img) {
        const imgRect = img.getBoundingClientRect()
        const imageDisplaySize = Math.min(imgRect.width, imgRect.height)
        const bboxDisplaySize = Math.min(bbox.width, bbox.height)

        // Scale line width based on both image and bbox size
        const scaleFactor = Math.sqrt((imageDisplaySize + bboxDisplaySize) / 600) * zoomLevel
        lineWidth = Math.max(1, Math.min(5, 3 * scaleFactor))
      }

      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.setLineDash([])

      const x = bbox.x || 0
      const y = bbox.y || 0
      const width = bbox.width || 0
      const height = bbox.height || 0

      ctx.strokeRect(x, y, width, height)

      // Add a semi-transparent fill for better visibility
      ctx.fillStyle = color + '20' // Add transparency
      ctx.fillRect(x, y, width, height)

      ctx.restore()
    },
    [zoomLevel],
  )

  const drawKeypoints = useCallback(
    (ctx, keypoints, canvasWidth, canvasHeight, color = '#ff00ff', boundingBox = null) => {
      if (!keypoints || !ctx || keypoints.length === 0) return

      // Get the actual displayed image dimensions for better scaling reference
      const img = imageRef.current
      let displayedImageWidth = canvasWidth
      let displayedImageHeight = canvasHeight

      if (img && img.offsetWidth > 0 && img.offsetHeight > 0) {
        // Use actual displayed image dimensions if available
        displayedImageWidth = img.offsetWidth
        displayedImageHeight = img.offsetHeight
      } else {
        // Fallback: use current image dimensions from Redux state
        if (currentImage && currentImage.dimensions) {
          displayedImageWidth = currentImage.dimensions.width * zoomLevel
          displayedImageHeight = currentImage.dimensions.height * zoomLevel
        }
      }

      // Calculate a base scale factor considering both bbox and overall image size
      let scaleFactor = 1

      if (boundingBox && boundingBox.width && boundingBox.height) {
        // Use bounding box size as PRIMARY reference - it should dominate the scaling
        const bboxDisplaySize = Math.min(boundingBox.width, boundingBox.height)
        const imageDisplaySize = Math.min(displayedImageWidth, displayedImageHeight)

        // Much more bbox-centric scaling - bbox should determine size, not image
        const bboxScale = bboxDisplaySize / 80 // Increased divisor for smaller keypoints relative to bbox
        const imageScale = imageDisplaySize / 400 // Reduced image influence
        scaleFactor = Math.sqrt(bboxScale * 0.95 + imageScale * 0.05) // Heavily favor bbox size (95% vs 5%)
      } else {
        // Fallback to image size only
        const imageDisplaySize = Math.min(displayedImageWidth, displayedImageHeight)
        scaleFactor = Math.sqrt(imageDisplaySize / 300) // More conservative for no bbox
      }

      // Apply zoom level to the scale factor
      scaleFactor *= zoomLevel

      // Determine if this is a small or large bounding box (not image)
      const bboxSize = boundingBox ? Math.min(boundingBox.width, boundingBox.height) : 100
      const isSmallBbox = bboxSize < 30 // Very small face detection
      const isLargeBbox = bboxSize > 80 // Large face detection

      // Size ranges that are much more conservative and bbox-proportional
      let keypointRadius, fontSize, labelOffset

      if (isSmallBbox) {
        // Very small bboxes: tiny keypoints and text that don't overwhelm the face
        keypointRadius = Math.max(1, Math.min(3, 2 + 2 * scaleFactor)) // Range: 1-3px
        fontSize = Math.max(5, Math.min(7, 6 + 2 * scaleFactor)) // Range: 5-7px (much smaller)
        labelOffset = Math.max(2, Math.min(6, 3 + 3 * scaleFactor)) // Range: 2-6px
      } else if (isLargeBbox) {
        // Large bboxes: allow larger keypoints and text but still proportional
        keypointRadius = Math.max(3, Math.min(12, 4 + 6 * scaleFactor)) // Range: 3-12px
        fontSize = Math.max(8, Math.min(16, 10 + 6 * scaleFactor)) // Range: 8-16px (reduced from 24px)
        labelOffset = Math.max(6, Math.min(15, 8 + 7 * scaleFactor)) // Range: 6-15px
      } else {
        // Medium bboxes: balanced but conservative approach
        keypointRadius = Math.max(2, Math.min(6, 3 + 3 * scaleFactor)) // Range: 2-6px
        fontSize = Math.max(6, Math.min(10, 7 + 3 * scaleFactor)) // Range: 6-10px (reduced from 16px)
        labelOffset = Math.max(3, Math.min(10, 5 + 5 * scaleFactor)) // Range: 3-10px
      }

      // Apply user-controlled point size multiplier
      keypointRadius *= pointSizeMultiplier

      // Debug logging for scale factor calculation with more details
      console.log('🔍 BBOX-FOCUSED Keypoint scaling debug:', {
        boundingBox: boundingBox
          ? `${boundingBox.width.toFixed(1)}x${boundingBox.height.toFixed(1)}`
          : 'none',
        displayedImage: `${displayedImageWidth.toFixed(1)}x${displayedImageHeight.toFixed(1)}`,
        bboxClassification: {
          bboxSize: bboxSize.toFixed(1),
          isSmallBbox: isSmallBbox,
          isMediumBbox: !isSmallBbox && !isLargeBbox,
          isLargeBbox: isLargeBbox,
        },
        scaleFactor: scaleFactor.toFixed(3),
        zoomLevel: zoomLevel.toFixed(2),
        calculatedSizes: {
          keypointRadius: keypointRadius.toFixed(1),
          fontSize: fontSize.toFixed(1),
          labelOffset: labelOffset.toFixed(1),
        },
        ratios: {
          keypointToBbox: boundingBox
            ? `${((keypointRadius / bboxSize) * 100).toFixed(1)}%`
            : 'N/A',
        },
        imageSource: img && img.offsetWidth > 0 ? 'DOM element' : 'Redux fallback',
      })

      ctx.save()
      keypoints.forEach((point, index) => {
        if (point && typeof point.x === 'number' && typeof point.y === 'number') {
          // Draw keypoint circles in the specified color
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(point.x, point.y, keypointRadius, 0, 2 * Math.PI)
          ctx.fill()

          // Add white border with proportional thickness
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = Math.max(0.5, Math.min(2, keypointRadius * 0.3))
          ctx.stroke()

          // Note: Keypoint labels removed for cleaner display
        }
      })
      ctx.restore()
    },
    [zoomLevel, currentImage, canvasRef, pointSizeMultiplier],
  )

  // Function to draw resize handles
  const drawResizeHandles = useCallback((ctx, bbox, canvasWidth, canvasHeight) => {
    if (!bbox || !ctx) return
    
    const handleSize = 16 // Increased size of resize handles
    const handleColor = '#ffffff'
    const handleBorderColor = '#007bff'
    
    const left = bbox.x
    const right = bbox.x + bbox.width
    const top = bbox.y
    const bottom = bbox.y + bbox.height
    const centerX = bbox.x + bbox.width / 2
    const centerY = bbox.y + bbox.height / 2
    
    const handles = [
      { x: left, y: top, type: 'nw' },
      { x: right, y: top, type: 'ne' },
      { x: left, y: bottom, type: 'sw' },
      { x: right, y: bottom, type: 'se' },
      { x: centerX, y: top, type: 'n' },
      { x: centerX, y: bottom, type: 's' },
      { x: left, y: centerY, type: 'w' },
      { x: right, y: centerY, type: 'e' },
    ]
    
    ctx.save()
    
    handles.forEach(handle => {
      // Draw handle shadow for better visibility
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      ctx.fillRect(
        handle.x - handleSize / 2 + 1,
        handle.y - handleSize / 2 + 1,
        handleSize,
        handleSize
      )
      
      // Draw handle background
      ctx.fillStyle = handleColor
      ctx.fillRect(
        handle.x - handleSize / 2,
        handle.y - handleSize / 2,
        handleSize,
        handleSize
      )
      
      // Draw handle border
      ctx.strokeStyle = handleBorderColor
      ctx.lineWidth = 2
      ctx.strokeRect(
        handle.x - handleSize / 2,
        handle.y - handleSize / 2,
        handleSize,
        handleSize
      )
    })
    
    ctx.restore()
  }, [])

  // Function to redraw all canvas elements
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !img) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Get displayed image dimensions for label scaling
    const imgRect = img.getBoundingClientRect()
    const displayedImageWidth = imgRect.width
    const displayedImageHeight = imgRect.height

    // Calculate scale factors from original image to displayed image
    const originalWidth = imageData?.imageSize?.[0] || canvas.width
    const originalHeight = imageData?.imageSize?.[1] || canvas.height
    const scaleX = canvas.width / originalWidth
    const scaleY = canvas.height / originalHeight

    console.log('Canvas dimensions:', { width: canvas.width, height: canvas.height })
    console.log('Original image size:', [originalWidth, originalHeight])
    console.log('Scale factors:', { scaleX, scaleY })

    // Draw existing detections
    if (localPrefs.showExistingDetections && existingDetections.length > 0) {
      existingDetections.forEach((detection, index) => {
        console.log('Original detection coordinates:', detection)

        // Scale coordinates from original image space to canvas space
        const scaledBbox = {
          x: detection.x * scaleX,
          y: detection.y * scaleY,
          width: detection.width * scaleX,
          height: detection.height * scaleY,
        }

        console.log('Scaled detection coordinates:', scaledBbox)

        drawBoundingBox(ctx, scaledBbox, '#00ff00', canvas.width, canvas.height)

        // Note: Detection labels removed for cleaner display

        // Draw keypoints for existing detections if they exist
        if (
          localPrefs.showExistingDetections &&
          detection.keyPoints &&
          detection.keyPoints.length > 0
        ) {
          // Convert keypoints from original coordinates to canvas coordinates
          const scaledKeyPoints = detection.keyPoints.map((kp) => ({
            ...kp,
            x: kp.x * scaleX,
            y: kp.y * scaleY,
          }))
          // Use green color for existing detection keypoints, pass scaled bounding box for sizing
          drawKeypoints(ctx, scaledKeyPoints, canvas.width, canvas.height, '#00ff00', scaledBbox)
        }
      })
    }

    // Draw new detections (convert from original coordinates to canvas coordinates)
    if (newDetections.length > 0) {
      newDetections.forEach((detection, index) => {
        // Scale coordinates from original image space to canvas space
        const scaledBbox = {
          x: detection.x * scaleX,
          y: detection.y * scaleY,
          width: detection.width * scaleX,
          height: detection.height * scaleY,
        }

        // Draw manual detections in magenta
        drawBoundingBox(ctx, scaledBbox, '#ff00ff', canvas.width, canvas.height)

        // Note: Detection labels removed for cleaner display

        // Draw keypoints for manual detections if they exist
        if (detection.keyPoints && detection.keyPoints.length > 0) {
          // Convert keypoints from original coordinates to canvas coordinates
          const scaledKeyPoints = detection.keyPoints.map((kp) => ({
            ...kp,
            x: kp.x * scaleX,
            y: kp.y * scaleY,
          }))
          drawKeypoints(ctx, scaledKeyPoints, canvas.width, canvas.height, '#ff00ff', scaledBbox)
        }
      })
    }

    // Draw manual bounding box (already in canvas coordinates) - use magenta
    if (manualBbox) {
      drawBoundingBox(ctx, manualBbox, '#ff00ff', canvas.width, canvas.height)
      // Draw resize handles for manual bounding box
      drawResizeHandles(ctx, manualBbox, canvas.width, canvas.height)
    }

    // Draw current drawing box (already in canvas coordinates) - use magenta while drawing
    if (currentBbox) {
      ctx.save()
      ctx.strokeStyle = '#ff00ff' // Changed from yellow to magenta
      ctx.lineWidth = 6 // Changed thickness to 6px
      ctx.setLineDash([5, 5])
      ctx.strokeRect(currentBbox.x, currentBbox.y, currentBbox.width, currentBbox.height)
      ctx.restore()
    }

    // Draw manual key points (already in canvas coordinates) - use magenta
    if (manualKeyPoints.length > 0) {
      // Pass the manual bounding box for proportional sizing
      drawKeypoints(ctx, manualKeyPoints, canvas.width, canvas.height, '#ff00ff', manualBbox)
    }
  }, [
    existingDetections,
    newDetections,
    manualBbox,
    currentBbox,
    manualKeyPoints,
    localPrefs,
    drawBoundingBox,
    drawKeypoints,
    imageData,
    zoomLevel,
    imagePosition,
  ])

  // Effect to redraw canvas when state changes
  useEffect(() => {
    if (canvasRef.current && imageRef.current && currentImage) {
      redrawCanvas()
    }
  }, [
    currentImage,
    manualBbox,
    manualKeyPoints,
    currentBbox,
    newDetections,
    zoomLevel,
    imagePosition,
    redrawCanvas,
  ])

  // Effect to update canvas positioning when zoom or panning changes
  useEffect(() => {
    if (imageRef.current && canvasRef.current && currentImage) {
      const img = imageRef.current
      const canvas = canvasRef.current

      // Update canvas positioning to match zoomed and panned image
      const updateCanvasPosition = () => {
        canvas.style.width = `${img.offsetWidth}px`
        canvas.style.height = `${img.offsetHeight}px`
        canvas.style.left = `${img.offsetLeft}px`
        canvas.style.top = `${img.offsetTop}px`

        // Redraw after positioning update
        setTimeout(() => redrawCanvas(), 50)
      }

      // Small delay to ensure the image has updated its size
      setTimeout(updateCanvasPosition, 100)
    }
  }, [zoomLevel, imagePosition, redrawCanvas])

  // Effect to handle window resize and ensure canvas stays properly positioned and scaled
  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current && canvasRef.current && currentImage) {
        console.log('🔄 Window resized, updating canvas positioning and redrawing')

        // Small delay to ensure DOM has updated after resize
        setTimeout(() => {
          const img = imageRef.current
          const canvas = canvasRef.current

          if (img && canvas) {
            // Update canvas positioning to match resized image
            canvas.style.width = `${img.offsetWidth}px`
            canvas.style.height = `${img.offsetHeight}px`
            canvas.style.left = `${img.offsetLeft}px`
            canvas.style.top = `${img.offsetTop}px`

            // Redraw all elements with new scaling
            redrawCanvas()
          }
        }, 100)
      }
    }

    // ResizeObserver for more accurate container resize detection
    let resizeObserver
    if (imageRef.current && canvasRef.current && currentImage) {
      const img = imageRef.current
      const container = img.parentElement

      resizeObserver = new ResizeObserver((entries) => {
        console.log('📐 Container resized via ResizeObserver')
        // Debounce the resize handler
        setTimeout(() => {
          if (imageRef.current && canvasRef.current) {
            const updatedImg = imageRef.current
            const updatedCanvas = canvasRef.current

            // Update canvas positioning
            updatedCanvas.style.width = `${updatedImg.offsetWidth}px`
            updatedCanvas.style.height = `${updatedImg.offsetHeight}px`
            updatedCanvas.style.left = `${updatedImg.offsetLeft}px`
            updatedCanvas.style.top = `${updatedImg.offsetTop}px`

            // Redraw with new scaling
            redrawCanvas()
          }
        }, 50)
      })

      if (container) {
        resizeObserver.observe(container)
      }
    }

    // Add resize listener as fallback
    window.addEventListener('resize', handleResize)

    // Cleanup listeners on unmount
    return () => {
      window.removeEventListener('resize', handleResize)
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
    }
  }, [currentImage, imagePosition, redrawCanvas])

  // Action handlers using Redux
  const handleGenerateEmbedding = useCallback(async () => {
    if (manualBbox || manualKeyPoints.length > 0) {
      // Convert canvas coordinates back to original image coordinates
      const canvas = canvasRef.current
      const originalWidth = imageData?.imageSize?.[0] || canvas?.width || 1
      const originalHeight = imageData?.imageSize?.[1] || canvas?.height || 1
      const canvasWidth = canvas?.width || 1
      const canvasHeight = canvas?.height || 1

      const scaleX = originalWidth / canvasWidth
      const scaleY = originalHeight / canvasHeight

      console.log('Converting manual bbox to original coordinates:', {
        manualBbox,
        scaleFactors: { scaleX, scaleY },
        originalImageSize: [originalWidth, originalHeight],
        canvasSize: [canvasWidth, canvasHeight],
      })

      // Create a new detection object with coordinates in original image space
      const newDetection = {
        id: Date.now(), // Temporary ID
        x: manualBbox ? Math.round(manualBbox.x * scaleX) : 0,
        y: manualBbox ? Math.round(manualBbox.y * scaleY) : 0,
        width: manualBbox ? Math.round(manualBbox.width * scaleX) : 100,
        height: manualBbox ? Math.round(manualBbox.height * scaleY) : 100,
        estimatedAge: null,
        estimatedGender: null,
        confidence: null,
        faceSize: manualBbox
          ? Math.round(manualBbox.width * scaleX * manualBbox.height * scaleY)
          : null,
        embedding: null, // Would be generated by the backend
        keyPoints:
          manualKeyPoints.length > 0
            ? manualKeyPoints.map((kp) => ({
                ...kp,
                x: Math.round(kp.x * scaleX),
                y: Math.round(kp.y * scaleY),
              }))
            : null,
        isManual: true, // Flag to indicate this was manually added
      }

      // Add to local new detections
      setNewDetections((prev) => [...prev, newDetection])

      // Clear current annotations to allow adding another detection
      dispatch(setManualBbox(null))
      dispatch(clearKeyPoints())
      dispatch(setIsDrawing(false))
      dispatch(setIsMarkingKeyPoints(false))
      setIsBboxDrawingEnabled(false)
      setDrawingStart(null)
      setCurrentBbox(null)

      console.log('New detection added (original coordinates):', newDetection)
    }
  }, [dispatch, manualBbox, manualKeyPoints, imageData])

  const handleClearManualAnnotations = useCallback(() => {
    dispatch(setManualBbox(null))
    dispatch(clearKeyPoints())
    dispatch(setIsDrawing(false))
    dispatch(setIsMarkingKeyPoints(false))
    setIsBboxDrawingEnabled(false)
    setDrawingStart(null)
    setCurrentBbox(null)
  }, [dispatch])

  const handleRemoveLastKeyPoint = useCallback(() => {
    dispatch(removeLastKeyPoint())
  }, [dispatch])

  const handleToggleKeyPointMode = useCallback(() => {
    if (!manualBbox) {
      console.warn('Please draw a bounding box before marking keypoints')
      return
    }
    dispatch(setIsMarkingKeyPoints(!isMarkingKeyPoints))
  }, [dispatch, isMarkingKeyPoints, manualBbox])

  const handleToggleBboxDrawingMode = useCallback(() => {
    console.log('🔘 DRAW BOX BUTTON CLICKED!', {
      currentState: isBboxDrawingEnabled,
      newState: !isBboxDrawingEnabled,
      hasManualBbox: !!manualBbox,
    })
    setIsBboxDrawingEnabled(!isBboxDrawingEnabled)
    // If disabling, also disable drawing state
    if (isBboxDrawingEnabled) {
      dispatch(setIsDrawing(false))
      setDrawingStart(null)
      setCurrentBbox(null)
    }
  }, [isBboxDrawingEnabled, dispatch, manualBbox])

  const handleClearBbox = useCallback(() => {
    dispatch(setManualBbox(null))
    setIsBboxDrawingEnabled(false)
    dispatch(setIsDrawing(false))
    setDrawingStart(null)
    setCurrentBbox(null)
  }, [dispatch])

  // Auto-disable keypoint mode when 5 points are reached
  useEffect(() => {
    if (manualKeyPoints.length >= 5 && isMarkingKeyPoints) {
      dispatch(setIsMarkingKeyPoints(false))
    }
  }, [manualKeyPoints.length, isMarkingKeyPoints, dispatch])

  const handleRemoveNewDetection = useCallback((detectionId) => {
    setNewDetections((prev) => prev.filter((d) => d.id !== detectionId))
  }, [])

  const handleSaveAndClose = useCallback(() => {
    if (newDetections.length > 0) {
      // Combine existing detections with new ones
      const updatedDetections = [...existingDetections, ...newDetections]
      onDetectionsUpdate?.(updatedDetections)
    }
    onClose()
  }, [newDetections, existingDetections, onDetectionsUpdate, onClose])

  return (
    <CModal visible={visible} onClose={onClose} size="xl" scrollable fullscreen>
      <CModalHeader>
        <CModalTitle>Add Manual Face Detections</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {/* Error Display */}
        {error && (
          <CAlert color="danger" dismissible onClose={() => dispatch(clearError())}>
            {error}
          </CAlert>
        )}

        {/* Success Display */}
        {success && (
          <CAlert color="success" dismissible onClose={() => dispatch(clearResults())}>
            {success}
          </CAlert>
        )}

        <CRow>
          <CCol md={8}>
            {/* Image Display */}
            {currentImage ? (
              <>
                {/* Image Controls Instructions */}
                <div className="mb-2">
                  <small className="text-muted">
                    <strong>Controls:</strong> Drag to pan • Ctrl+wheel to zoom •
                    {isBboxDrawingEnabled
                      ? ' Drag on image to draw bounding box'
                      : isMarkingKeyPoints
                        ? ' Click within bounding box to mark keypoints'
                        : ' Click "Draw Box" to start annotation'}
                  </small>
                </div>

                <div
                  className="position-relative"
                  style={{
                    width: '100%',
                    height: '70vh', // Use viewport height for better scaling
                    overflow: 'hidden', // Hide overflow when panning
                    border: '1px solid var(--cui-border-color)',
                    backgroundColor: 'var(--cui-body-bg)',
                    display: 'flex',
                    justifyContent: zoomLevel <= 1 ? 'center' : 'flex-start', // Only center when zoomed out
                    alignItems: zoomLevel <= 1 ? 'center' : 'flex-start', // Only center when zoomed out
                  }}
                  onWheel={handleWheel}
                >
                  {/* Zoom Controls */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      zIndex: 1000,
                      display: 'flex',
                      gap: '5px',
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      borderRadius: '4px',
                      padding: '5px',
                    }}
                  >
                    <CButton
                      size="sm"
                      color="primary"
                      onClick={() => setZoomLevel((prev) => Math.max(0.25, prev - 0.25))}
                      disabled={zoomLevel <= 0.25}
                    >
                      −
                    </CButton>
                    <span
                      style={{
                        color: 'white',
                        padding: '0 10px',
                        fontSize: '14px',
                        lineHeight: '31px',
                      }}
                    >
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <CButton
                      size="sm"
                      color="primary"
                      onClick={() => setZoomLevel((prev) => Math.min(4, prev + 0.25))} // Max zoom 400%
                      disabled={zoomLevel >= 4} // Disable at 400%
                    >
                      +
                    </CButton>
                    <CButton
                      size="sm"
                      color="primary"
                      onClick={() => setZoomLevel(1)}
                      title="Reset to original size (100%)"
                    >
                      Original Size
                    </CButton>
                    <CButton
                      size="sm"
                      color="primary"
                      onClick={handleResetImagePosition}
                      title="Reset image position"
                    >
                      Center
                    </CButton>
                  </div>

                  <img
                    ref={imageRef}
                    src={currentImage.preview}
                    alt="Detection Image"
                    style={{
                      maxWidth: 'none', // Remove max width constraint
                      maxHeight: 'none', // Remove max height constraint
                      // Use actual pixel dimensions based on natural size and zoom level
                      width: currentImage.dimensions
                        ? `${currentImage.dimensions.width * zoomLevel}px`
                        : 'auto',
                      height: 'auto',
                      objectFit: 'contain',
                      transform: `translate(${imagePosition.x}px, ${imagePosition.y}px)`, // Apply panning
                      userSelect: 'none', // Prevent text selection during dragging
                      pointerEvents: 'none', // Let canvas handle all mouse events
                    }}
                    onLoad={() => {
                      console.log('🖼️ Image element loaded, syncing canvas')
                      if (imageRef.current && canvasRef.current) {
                        const img = imageRef.current
                        const canvas = canvasRef.current
                        const container = img.parentElement

                        console.log('Image dimensions:', {
                          natural: { width: img.naturalWidth, height: img.naturalHeight },
                          displayed: { width: img.offsetWidth, height: img.offsetHeight },
                          container: {
                            width: container.offsetWidth,
                            height: container.offsetHeight,
                          },
                        })

                        // Set canvas resolution to match natural image size
                        canvas.width = img.naturalWidth
                        canvas.height = img.naturalHeight

                        // Update canvas positioning to match image
                        canvas.style.width = `${img.offsetWidth}px`
                        canvas.style.height = `${img.offsetHeight}px`
                        canvas.style.left = `${img.offsetLeft}px`
                        canvas.style.top = `${img.offsetTop}px`

                        console.log('Canvas setup complete')

                        // Redraw all canvas elements
                        setTimeout(() => {
                          redrawCanvas()
                        }, 100) // Small delay to ensure positioning is complete
                      }
                    }}
                    onError={(e) => {
                      console.error('Failed to load image:', e)
                      console.error('Image URL:', currentImage.preview)
                    }}
                  />
                  <canvas
                    ref={canvasRef}
                    className="position-absolute"
                    style={{
                      cursor: isPanning
                        ? 'grabbing'
                        : isResizing
                          ? getCursorForHandle(resizeHandle)
                          : hoverHandle
                            ? getCursorForHandle(hoverHandle)
                            : isMarkingKeyPoints
                              ? 'crosshair'
                              : isBboxDrawingEnabled || isDrawing
                                ? 'crosshair'
                                : 'grab',
                      pointerEvents: 'auto', // Ensure canvas can receive mouse events
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      zIndex: 10, // Ensure canvas is on top
                      transform: `translate(${imagePosition.x}px, ${imagePosition.y}px)`, // Canvas moves with image
                    }}
                    onMouseDown={(e) => {
                      // First priority: Check for resize handles
                      const coords = getCanvasCoordinates(e)
                      if (coords && manualBbox && !isBboxDrawingEnabled && !isMarkingKeyPoints && !isDrawing) {
                        const handle = getResizeHandle(coords, manualBbox)
                        if (handle) {
                          // Handle resize, don't allow panning
                          handleCanvasMouseDown(e)
                          return
                        }
                      }
                      
                      // Second priority: Handle panning if conditions are met
                      if (
                        e.button === 0 &&
                        !isBboxDrawingEnabled &&
                        !isMarkingKeyPoints &&
                        !isDrawing
                      ) {
                        handleImageMouseDown(e)
                      } else {
                        handleCanvasMouseDown(e)
                      }
                    }}
                    onMouseMove={(e) => {
                      if (isResizing) {
                        // Prioritize resize operations
                        handleCanvasMouseMove(e)
                      } else if (isPanning) {
                        handleImageMouseMove(e)
                      } else {
                        handleCanvasMouseMove(e)
                      }
                    }}
                    onMouseUp={(e) => {
                      if (isResizing) {
                        // Prioritize resize operations
                        handleCanvasMouseUp(e)
                      } else if (isPanning) {
                        handleImageMouseUp(e)
                      } else {
                        handleCanvasMouseUp(e)
                      }
                    }}
                    onMouseEnter={handleCanvasMouseEnter}
                    onMouseLeave={(e) => {
                      if (isResizing) {
                        // End resize if mouse leaves during resize
                        handleCanvasMouseLeave()
                      } else if (isPanning) {
                        handleImageMouseLeave()
                      } else {
                        handleCanvasMouseLeave()
                      }
                    }}
                  />

                  {/* Cursor label close to crosshair for keypoint marking */}
                  {isMarkingKeyPoints &&
                    manualBbox &&
                    cursorPosition.visible &&
                    manualKeyPoints.length < 5 &&
                    (() => {
                      const labelStyles = getCursorLabelStyles()
                      return (
                        <div
                          style={{
                            position: 'fixed',
                            left: cursorPosition.x + 15, // More space from cursor
                            top: cursorPosition.y - 50, // More space above the crosshair
                            zIndex: 1001,
                            backgroundColor: '#ff00ff',
                            color: 'white',
                            padding: labelStyles.padding,
                            borderRadius: labelStyles.borderRadius,
                            fontSize: `${labelStyles.fontSize}px`,
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                            border: '1px solid white',
                            textAlign: 'center',
                          }}
                        >
                          <div
                            style={{ fontSize: `${labelStyles.counterFontSize}px`, opacity: 0.9 }}
                          >
                            {manualKeyPoints.length + 1}/5
                          </div>
                          <div
                            style={{ fontSize: `${labelStyles.fontSize}px`, fontWeight: 'bold' }}
                          >
                            {
                              ['Left Eye', 'Right Eye', 'Nose', 'Left Mouth', 'Right Mouth'][
                                manualKeyPoints.length
                              ]
                            }
                          </div>
                        </div>
                      )
                    })()}
                </div>

                {/* Point Size Adjuster */}
                <div className="mt-3">
                  <div className="d-flex align-items-center justify-content-center gap-3">
                    <small className="text-muted">Adjust Keypoint Size:</small>
                    <CButton
                      size="sm"
                      color="primary"
                      onClick={() => setPointSizeMultiplier((prev) => Math.max(0.3, prev - 0.1))}
                      disabled={pointSizeMultiplier <= 0.3}
                      title="Decrease keypoint size"
                    >
                      −
                    </CButton>
                    <span
                      style={{
                        minWidth: '60px',
                        textAlign: 'center',
                        fontSize: '14px',
                        fontWeight: 'bold',
                      }}
                    >
                      {Math.round(pointSizeMultiplier * 100)}%
                    </span>
                    <CButton
                      size="sm"
                      color="primary"
                      onClick={() => setPointSizeMultiplier((prev) => Math.min(3.0, prev + 0.1))}
                      disabled={pointSizeMultiplier >= 3.0}
                      title="Increase keypoint size"
                    >
                      +
                    </CButton>
                    <CButton
                      size="sm"
                      color="primary"
                      onClick={() => setPointSizeMultiplier(1.0)}
                      title="Reset to default size"
                    >
                      Reset
                    </CButton>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center p-4 border rounded">
                <p className="text-muted">{visible ? 'Loading image...' : 'No image available'}</p>
                {visible && imageData && (
                  <div className="mt-2">
                    <small className="text-muted">
                      Image URL: {imageData.url || 'No URL found'}
                      <br />
                      Image Size:{' '}
                      {imageData.imageSize
                        ? `${imageData.imageSize[0]}x${imageData.imageSize[1]}`
                        : 'Unknown'}
                    </small>
                  </div>
                )}
              </div>
            )}
          </CCol>

          <CCol md={4}>
            {/* Display Options */}
            <CCard className="mb-3">
              <CCardBody>
                <h6>Display Options</h6>
                <CFormCheck
                  checked={localPrefs.showExistingDetections}
                  onChange={(e) =>
                    setLocalPrefs({
                      ...localPrefs,
                      showExistingDetections: e.target.checked,
                    })
                  }
                  label="Show existing detections & keypoints (green)"
                />
              </CCardBody>
            </CCard>

            {/* Manual Annotations */}
            <CCard className="mb-3">
              <CCardBody>
                <h6>Manual Face Detection</h6>
                <p className="text-muted small mb-3">
                  Bounding box defines the face region and keypoints improve alignment quality.
                </p>

                {/* Step-by-step workflow */}
                <div className="mb-3">
                  <div className="mb-2">
                    <strong>Step 1: Bounding Box {manualBbox ? '(✓ Complete)' : ''}</strong>
                  </div>
                  {manualBbox ? (
                    <div className="text-success mb-2">
                      Face region defined (magenta box)
                      {!isMarkingKeyPoints && manualKeyPoints.length === 0 && (
                        <CButton
                          color="outline-danger"
                          size="sm"
                          className="ms-2"
                          onClick={handleClearBbox}
                        >
                          Clear
                        </CButton>
                      )}
                    </div>
                  ) : isBboxDrawingEnabled ? (
                    <small className="text-info d-block mb-2">
                      Click and drag on the image to draw a bounding box around the face
                    </small>
                  ) : (
                    <small className="text-muted d-block mb-2">
                      Click "Draw Box" button then drag on image to define face region
                    </small>
                  )}
                  {!manualBbox && (
                    <CButton
                      color={isBboxDrawingEnabled ? 'danger' : 'primary'}
                      size="sm"
                      onClick={handleToggleBboxDrawingMode}
                    >
                      {isBboxDrawingEnabled ? 'Stop Drawing' : 'Draw Box'}
                    </CButton>
                  )}
                </div>

                <div className="mb-3">
                  <div className="mb-2">
                    <strong>
                      Step 2: Key Points ({manualKeyPoints.length}/5)
                      {manualKeyPoints.length >= 5 ? ' (✓ Complete)' : ''}
                    </strong>
                  </div>
                  {isMarkingKeyPoints && manualBbox && manualKeyPoints.length < 5 && (
                    <small className="text-info d-block mb-2">
                      <strong>Step {manualKeyPoints.length + 1}:</strong> Click to mark{' '}
                      {
                        [
                          'left eye',
                          'right eye',
                          'nose',
                          'left mouth corner',
                          'right mouth corner',
                        ][manualKeyPoints.length]
                      }
                      <br />
                      <em>Follow the cursor label for guidance</em>
                    </small>
                  )}
                  {manualKeyPoints.length >= 5 && (
                    <small className="text-success d-block mb-2">
                      All 5 landmarks marked (optimal embedding quality)
                    </small>
                  )}
                  {manualKeyPoints.length > 0 &&
                    manualKeyPoints.length < 5 &&
                    !isMarkingKeyPoints && (
                      <small className="text-info d-block mb-2">
                        {manualKeyPoints.length}/5 landmarks marked (click "Mark Points" to
                        continue)
                      </small>
                    )}
                  <div className="d-flex align-items-center gap-2 mb-3">
                    {manualKeyPoints.length < 5 && (
                      <CButton
                        color={isMarkingKeyPoints ? 'danger' : 'primary'}
                        size="sm"
                        onClick={handleToggleKeyPointMode}
                        disabled={!manualBbox}
                      >
                        {isMarkingKeyPoints ? 'Stop Marking' : 'Mark Points'}
                      </CButton>
                    )}
                    {!manualBbox && <small className="text-muted">(Complete Step 1 first)</small>}
                    {manualKeyPoints.length > 0 &&
                      manualKeyPoints.length < 5 &&
                      !isMarkingKeyPoints && (
                        <CButton
                          color="outline-warning"
                          size="sm"
                          onClick={handleRemoveLastKeyPoint}
                        >
                          Remove Last
                        </CButton>
                      )}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="mb-2">
                    <strong>Step 3: Save Detection {manualKeyPoints.length >= 5 ? '(✓ Ready)' : ''}</strong>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <CButton
                      color={manualKeyPoints.length >= 5 ? "success" : "primary"}
                      size="sm"
                      onClick={handleGenerateEmbedding}
                      disabled={!manualBbox || manualKeyPoints.length < 5}
                    >
                      Save Detection
                    </CButton>
                    {(!manualBbox || manualKeyPoints.length < 5) && (
                      <small className="text-muted">(Complete Steps 1 and 2 first)</small>
                    )}
                    {manualBbox && manualKeyPoints.length >= 5 && (
                      <CButton color="danger" size="sm" onClick={handleClearManualAnnotations}>
                        Clear All
                      </CButton>
                    )}
                  </div>
                </div>
              </CCardBody>
            </CCard>

            {/* New Detections */}
            {newDetections.length > 0 && (
              <CCard className="mb-3">
                <CCardBody>
                  <h6>Manual Detections ({newDetections.length})</h6>
                  {newDetections.map((detection, index) => (
                    <div
                      key={detection.id}
                      className="mb-2 d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <CBadge color="primary" className="me-2">
                          Detection {index + 1}
                        </CBadge>
                        <span className="small">
                          {Math.round(detection.width)}×{Math.round(detection.height)}px
                        </span>
                      </div>
                      <CButton
                        color="outline-danger"
                        size="sm"
                        onClick={() => handleRemoveNewDetection(detection.id)}
                      >
                        Remove
                      </CButton>
                    </div>
                  ))}
                </CCardBody>
              </CCard>
            )}

            {/* Existing Detections Info */}
            {existingDetections.length > 0 && (
              <CCard>
                <CCardBody>
                  <h6>Existing Detections ({existingDetections.length})</h6>
                  <p className="text-muted small mb-2">
                    These detections will be preserved when you save.
                  </p>
                  {existingDetections.map((detection, index) => (
                    <div key={index} className="mb-1 small">
                      <CBadge color="success" className="me-2">
                        Detection {index + 1}
                      </CBadge>
                      <span className="text-muted">
                        {Math.round(detection.width)}×{Math.round(detection.height)}px
                        {detection.keyPoints && detection.keyPoints.length > 0 && (
                          <span className="ms-2 text-info">
                            • {detection.keyPoints.length} keypoints
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </CCardBody>
              </CCard>
            )}
          </CCol>
        </CRow>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={handleSaveAndClose} disabled={newDetections.length === 0}>
          Save {newDetections.length > 0 && `(${newDetections.length} new)`}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default ManualEmbeddingModal
