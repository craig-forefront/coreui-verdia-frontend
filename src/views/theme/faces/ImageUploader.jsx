import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CSpinner,
  CAlert,
  CFormInput,
} from '@coreui/react';
import axios from 'axios';

const API_KEY = import.meta.env.REACT_APP_API_KEY;

const ImageUploader = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Handle file selection
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      
      // Create a preview URL
      const fileReader = new FileReader();
      fileReader.onload = () => {
        setPreviewUrl(fileReader.result);
      };
      fileReader.readAsDataURL(file);
      
      // Clear any previous errors
      setError(null);
    }
  };
  
  // Upload image and detect faces
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select an image file first');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Create form data for the API request
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Call the detect_faces API endpoint
      const response = await axios.post(
        `${import.meta.env.REACT_APP_API_URL}/detect/faces`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'X-API-Key': API_KEY
          },
          responseType: 'json',
        }
      );
      
      // Get the image data to pass along with the detection results
      // We need the original image to display with the bounding boxes
      const imageResponse = await axios.get(
        `${import.meta.env.REACT_APP_API_URL}/image/${response.data.probe_id}`,
        { 
          responseType: 'arraybuffer',
          headers: {
            'X-API-Key': API_KEY
          }
        }
      );
      
      // Combine the detection results with the image data
      const detectionResults = {
        ...response.data,
        imageData: imageResponse.data,
      };
      
      // Navigate to the Detections component with the results
      navigate('/theme/faces/detections', { state: { detectionResults } });
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(
        err.response?.data?.detail || 
        'Failed to process image. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Upload Image for Face Detection</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-3">
              <CCol md={6}>
                <CFormInput
                  type="file"
                  id="formFile"
                  label="Select an image to detect faces"
                  onChange={handleFileChange}
                  accept="image/*"
                  disabled={isLoading}
                />
              </CCol>
            </CRow>
            
            {previewUrl && (
              <CRow className="mb-3">
                <CCol md={6}>
                  <div style={{ maxWidth: '100%', maxHeight: '300px', overflow: 'hidden' }}>
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      style={{ width: '100%', objectFit: 'contain' }} 
                    />
                  </div>
                </CCol>
              </CRow>
            )}
            
            {error && (
              <CAlert color="danger" dismissible>
                {error}
              </CAlert>
            )}
            
            <CButton 
              color="primary" 
              onClick={handleUpload}
              disabled={!selectedFile || isLoading}
            >
              {isLoading ? (
                <>
                  <CSpinner size="sm" className="me-2" />
                  Processing...
                </>
              ) : (
                'Detect Faces'
              )}
            </CButton>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default ImageUploader;