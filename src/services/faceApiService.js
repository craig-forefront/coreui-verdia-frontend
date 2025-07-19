import axios from 'axios';
import { 
  API_ENDPOINTS, 
  PRIMARY_API_BASE_URL, 
  API_KEY, 
  DEFAULT_AXIOS_CONFIG,
  getPrimaryApiUrl 
} from '../config/api.js';

// Create axios instance with default configurations
const axiosInstance = axios.create({
    baseURL: PRIMARY_API_BASE_URL,
    ...DEFAULT_AXIOS_CONFIG
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
        const response = await axiosInstance.post(API_ENDPOINTS.PRIMARY.ENDPOINTS.FACE_IMAGES_PRESIGNED, { faceIds });
        
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
            const response = await axiosInstance.get(`${API_ENDPOINTS.PRIMARY.ENDPOINTS.FACE_IMAGE_SINGLE}/${face_id}`);
            
            if (response.data && response.data.url) {
                return response.data.url;
            } else {
                console.error('Received invalid presigned URL response structure:', response.data);
                return null;
            }
        } else {
            // Fallback to the old method if we can't extract a face ID
            const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
            
            const response = await axiosInstance.get(`${API_ENDPOINTS.PRIMARY.ENDPOINTS.FACE_IMAGE_SINGLE}/presigned-url`, {
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

/**
 * Generate manual face embedding using bounding box coordinates
 * @param {File} file - Image file 
 * @param {Object} bbox - Bounding box with {x1, y1, x2, y2} coordinates
 * @returns {Object} - Manual face response with embedding
 */
export const generateManualEmbedding = async (file, bbox) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('x1', bbox.x1);
        formData.append('y1', bbox.y1);
        formData.append('x2', bbox.x2);
        formData.append('y2', bbox.y2);
        
        console.log('Generating manual embedding with bbox:', bbox);
        
        const response = await axiosInstance.post('/detect/faces/manual-embedding', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        
        console.log('Manual embedding response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error generating manual embedding:', error);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        throw error;
    }
};

/**
 * Detect faces in image using InsightFace
 * @param {File} file - Image file
 * @returns {Object} - Detection response with faces and key points
 */
export const detectFacesInsightFace = async (file) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        console.log('Detecting faces with InsightFace');
        
        const response = await axiosInstance.post('/detect/faces/insightface', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        
        console.log('Face detection response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error detecting faces:', error);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        throw error;
    }
};

/**
 * Generate manual face embedding using key points (5 key points only)
 * @param {File} file - Image file 
 * @param {Array} keyPoints - Array of [x, y] coordinate pairs (must be exactly 5 points)
 * @returns {Object} - Manual face response with embedding
 */
export const generateManualEmbeddingWithKeyPoints = async (file, keyPoints) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('key_points', JSON.stringify(keyPoints));
        formData.append('key_point_mode', '5'); // Always use 5 key points
        formData.append('use_manual_keypoints_only', 'true'); // Explicitly indicate manual mode
        
        console.log('Generating manual embedding with 5 key points:', { keyPoints });
        
        const response = await axiosInstance.post('/detect/faces/manual-embedding-keypoints', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        
        console.log('Manual embedding with key points response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error generating manual embedding with key points:', error);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        throw error;
    }
};

export default {
    fetchPresignedUrls,
    fetchPresignedUrl,
    generateManualEmbedding,
    generateManualEmbeddingWithKeyPoints,
    detectFacesInsightFace
};