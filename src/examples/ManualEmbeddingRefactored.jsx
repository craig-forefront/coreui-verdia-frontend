// Example refactored ManualEmbedding component using Redux
import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    setCurrentImage,
    clearCurrentImage,
    setManualBbox,
    addKeyPoint,
    removeLastKeyPoint,
    clearKeyPoints,
    setIsDrawing,
    setIsMarkingKeyPoints,
    detectFaces,
    generateEmbedding
} from '../../store/faceProcessingSlice';

const ManualEmbeddingRefactored = () => {
    const dispatch = useDispatch();
    
    // Get all state from Redux instead of multiple useState calls
    const {
        currentImage,
        detectedFaces,
        autoDetectCompleted,
        manualBbox,
        manualKeyPoints,
        isDrawing,
        isMarkingKeyPoints,
        isDetecting,
        isGeneratingEmbedding,
        embeddingResults,
        error,
        success,
        status
    } = useSelector(state => state.faceProcessing);

    // Get user preferences for default settings
    const { 
        autoDetectOnUpload,
        defaultConfidenceThreshold 
    } = useSelector(state => state.userPreferences.faceProcessing);

    // Replace multiple local functions with Redux actions
    const handleImageUpload = useCallback((file) => {
        const preview = URL.createObjectURL(file);
        dispatch(setCurrentImage({ 
            file, 
            preview, 
            dimensions: { width: 0, height: 0 } 
        }));
        
        // Auto-detect if preference is enabled
        if (autoDetectOnUpload) {
            dispatch(detectFaces(file));
        }
    }, [dispatch, autoDetectOnUpload]);

    const handleDetectFaces = useCallback(() => {
        if (currentImage.file) {
            dispatch(detectFaces(currentImage.file));
        }
    }, [dispatch, currentImage.file]);

    const handleGenerateEmbedding = useCallback(() => {
        if (currentImage.file && (manualBbox || detectedFaces.length > 0)) {
            const bbox = manualBbox || detectedFaces[0]?.bbox;
            dispatch(generateEmbedding({
                imageFile: currentImage.file,
                bbox,
                keyPoints: manualKeyPoints
            }));
        }
    }, [dispatch, currentImage.file, manualBbox, detectedFaces, manualKeyPoints]);

    const handleAddKeyPoint = useCallback((x, y, type) => {
        dispatch(addKeyPoint({ x, y, type }));
    }, [dispatch]);

    // Significantly reduced component code by using Redux
    // All the complex state management is now in the slice
    
    return (
        <div>
            {/* Your existing JSX but with much simpler state management */}
            <p>Current status: {status}</p>
            <p>Detected faces: {detectedFaces.length}</p>
            <p>Manual key points: {manualKeyPoints.length}</p>
            {/* ... rest of your component */}
        </div>
    );
};

export default ManualEmbeddingRefactored;
