import axios from 'axios';

// Get API URL from environment or use default
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance with default configurations
const axiosInstance = axios.create({
    baseURL: API_URL,
    withCredentials: false,
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    },
    timeout: 10000 // 10 second timeout
});

/**
 * Fetch presigned URLs for multiple face images in batch
 * @param {Array} faceIds - Array of face IDs to get URLs for
 * @returns {Object} - Map of face IDs to presigned URLs
 */
export const fetchPresignedUrls = async (faceIds) => {
    if (!faceIds || faceIds.length === 0) {
        return {};
    }
    
    try {
        console.log(`Fetching presigned URLs for ${faceIds.length} faces in batch`);
        const response = await axiosInstance.post(`/api/face-images/presigned-urls`, { faceIds });
        
        if (response.data && response.data.urls) {
            console.log(`Successfully fetched ${Object.keys(response.data.urls).length} presigned URLs`);
            return response.data.urls;
        } else {
            console.error('Invalid response format for presigned URLs:', response.data);
            return {};
        }
    } catch (error) {
        console.error("Error fetching presigned URLs:", error);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        return {};
    }
};

/**
 * Fetch a single presigned URL for an image path
 * @param {string} imagePath - Path to the image
 * @returns {string|null} - Presigned URL or null if error
 */
export const fetchPresignedUrl = async (imagePath) => {
    if (!imagePath) {
        console.warn('No image path provided to fetchPresignedUrl');
        return null;
    }
    
    try {
        console.log(`Fetching presigned URL for: ${imagePath}`);
        
        // Extract the face ID from the image path
        // For paths like "/faces/1234.jpg" or "faces/1234.jpg"
        const matches = imagePath.match(/faces\/([^/.]+)\.jpg/);
        if (matches && matches[1]) {
            const face_id = matches[1];
            const response = await axiosInstance.get(`/api/face-images/${face_id}`);
            
            if (response.data && response.data.url) {
                return response.data.url;
            } else {
                console.error('Received invalid presigned URL response structure:', response.data);
                return null;
            }
        } else {
            // Fallback to the old method if we can't extract a face ID
            const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
            
            const response = await axiosInstance.get(`/api/face-images/presigned-url`, {
                params: { imagePath: path }
            });
            
            if (response.data && response.data.url) {
                return response.data.url;
            } else {
                console.error('Received invalid presigned URL response structure:', response.data);
                return null;
            }
        }
    } catch (error) {
        console.error(`Error fetching presigned URL for ${imagePath}:`, error);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        return null;
    }
};

export default {
    fetchPresignedUrls,
    fetchPresignedUrl
};