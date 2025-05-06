import { useState, useEffect, useCallback } from 'react';
import { fetchPresignedUrls, fetchPresignedUrl } from '../services/faceApiService';

/**
 * Custom hook to handle fetching and caching presigned URLs for face images
 * @param {Array} faceGroups - The face groups with image paths that need presigned URLs
 * @param {Function} setError - Function to set error messages
 * @returns {Object} - Methods and state for URL management
 */
const usePresignedUrls = (faceGroups, setError) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [urlCache, setUrlCache] = useState({}); // Cache to store presigned URLs
    
    // Process groups and update with presigned URLs
    const updateGroupsWithPresignedUrls = useCallback(async (groups) => {
        if (!groups || !groups.length) return groups;
        
        try {
            setIsProcessing(true);
            console.log(`Updating presigned URLs for ${groups.length} face groups`);
            
            // Process in smaller batches to avoid hanging
            const batchSize = 5;
            let updatedGroupsArray = [];
            
            for (let i = 0; i < groups.length; i += batchSize) {
                const groupBatch = groups.slice(i, i + batchSize);
                
                const batchPromises = groupBatch.map(async (group) => {
                    // Process representative image if it exists
                    let updatedGroup = { ...group };
                    
                    if (group.representative_image && !group.representative_image.startsWith('http')) {
                        // Check cache first
                        let presignedUrl = urlCache[group.representative_image];
                        
                        if (!presignedUrl) {
                            presignedUrl = await fetchPresignedUrl(group.representative_image);
                            if (presignedUrl) {
                                // Update cache
                                setUrlCache(prev => ({
                                    ...prev,
                                    [group.representative_image]: presignedUrl
                                }));
                            }
                        }
                        
                        if (presignedUrl) {
                            updatedGroup.representative_image_url = presignedUrl;
                        }
                    }
                    
                    // Process face images if they exist
                    if (group.faces && group.faces.length > 0) {
                        // Collect all image paths that need presigned URLs
                        const facesNeedingUrls = group.faces
                            .filter(face => face.image_url && !face.image_url.startsWith('http') && !urlCache[face.image_url])
                            .map(face => ({ id: face.id, path: face.image_url }));
                        
                        // Create an updated copy of faces with resolved URLs
                        const updatedFaces = await Promise.all(group.faces.map(async (face) => {
                            // Create a copy that we'll update with the proper URL
                            const updatedFace = { ...face };
                            
                            // If we already have a proper presigned_url that starts with http, use it
                            if (updatedFace.presigned_url && updatedFace.presigned_url.startsWith('http')) {
                                return updatedFace;
                            }
                            
                            // If we have an image_url, try to get or create a presigned URL for it
                            if (updatedFace.image_url) {
                                // Check if we already have this URL in cache
                                if (urlCache[updatedFace.image_url]) {
                                    updatedFace.presigned_url = urlCache[updatedFace.image_url];
                                    return updatedFace;
                                }
                                
                                // If it's already a full URL, use it directly
                                if (updatedFace.image_url.startsWith('http')) {
                                    updatedFace.presigned_url = updatedFace.image_url;
                                    return updatedFace;
                                }
                                
                                // Otherwise, fetch a new presigned URL
                                try {
                                    // First try batch fetching via face ID
                                    if (facesNeedingUrls.length > 0 && facesNeedingUrls.find(f => f.id === updatedFace.id)) {
                                        const faceIds = facesNeedingUrls.map(face => face.id);
                                        const urlMap = await fetchPresignedUrls(faceIds);
                                        
                                        if (urlMap[updatedFace.id]) {
                                            updatedFace.presigned_url = urlMap[updatedFace.id];
                                            
                                            // Update cache
                                            setUrlCache(prev => ({
                                                ...prev,
                                                [updatedFace.image_url]: updatedFace.presigned_url
                                            }));
                                            
                                            return updatedFace;
                                        }
                                    }
                                    
                                    // If batch fetching didn't work, try individual fetching
                                    const url = await fetchPresignedUrl(updatedFace.image_url);
                                    if (url) {
                                        updatedFace.presigned_url = url;
                                        
                                        // Update cache
                                        setUrlCache(prev => ({
                                            ...prev,
                                            [updatedFace.image_url]: url
                                        }));
                                    }
                                } catch (error) {
                                    console.error(`Error fetching presigned URL for face ${updatedFace.id}:`, error);
                                }
                            }
                            
                            return updatedFace;
                        }));
                        
                        updatedGroup.faces = updatedFaces;
                    }
                    
                    return updatedGroup;
                });
                
                // Wait for this batch to complete
                const batchResults = await Promise.all(batchPromises);
                updatedGroupsArray = [...updatedGroupsArray, ...batchResults];
            }
            
            console.log('Finished updating all face groups with presigned URLs');
            setIsProcessing(false);
            return updatedGroupsArray;
            
        } catch (error) {
            console.error("Error updating images with presigned URLs:", error);
            setError && setError("Failed to load face images properly. Please try again.");
            setIsProcessing(false);
            return groups; // Return original groups on error
        }
    }, [setError, urlCache]);
    
    // Get a presigned URL for a single image path
    const getPresignedUrl = useCallback(async (imagePath) => {
        if (!imagePath) return null;
        
        // If it's already a full URL, return it
        if (imagePath.startsWith('http')) {
            return imagePath;
        }
        
        // Check cache first
        if (urlCache[imagePath]) {
            return urlCache[imagePath];
        }
        
        // Otherwise fetch a new one
        try {
            const url = await fetchPresignedUrl(imagePath);
            if (url) {
                // Update cache
                setUrlCache(prev => ({
                    ...prev,
                    [imagePath]: url
                }));
                return url;
            }
        } catch (error) {
            console.error(`Error fetching presigned URL for ${imagePath}:`, error);
        }
        
        return null;
    }, [urlCache]);
    
    return {
        updateGroupsWithPresignedUrls,
        getPresignedUrl,
        urlCache,
        isProcessing
    };
};

export default usePresignedUrls;