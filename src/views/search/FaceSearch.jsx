import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  CCard,
  CCardBody,
  CCardTitle,
  CButton,
  CListGroup,
  CListGroupItem,
  CCloseButton,
  CSpinner,
  CRow,
  CCol,
  CTooltip,
} from '@coreui/react';
import { useNavigate } from 'react-router-dom';
import { Images } from 'lucide-react';
import axios from 'axios';
import { getPrimaryApiUrl, API_ENDPOINTS, API_KEY } from '../../config/api.js';

const FaceSearch = () => {
  const [files, setFiles] = useState([]);
  const navigate = useNavigate();

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: 'pending',
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: { 'image/*': [] },
    maxSize: 10 * 1024 * 1024,
  });

  const detectFaces = async (fileObj, index) => {
    const formData = new FormData();
    formData.append('file', fileObj.file);

    try {
      const response = await axios.post(getPrimaryApiUrl(API_ENDPOINTS.PRIMARY.ENDPOINTS.FACE_DETECTION), formData, {
        headers: {
          'X-API-Key': API_KEY,
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setFiles((prev) => {
            const updated = [...prev];
            updated[index].progress = progress;
            return updated;
          });
        },
      });

      setFiles((prev) => {
        const updated = [...prev];
        updated[index].status = 'done';
        updated[index].progress = 100;
        return updated;
      });

      // Convert blob URL to data URL for better persistence across navigation
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(fileObj.file);
      });

      // Return the response data with data URL instead of blob URL
      return {
        ...response.data,
        imagePreviewUrl: dataUrl,  // Use data URL instead of blob URL
        originalFilename: fileObj.file.name  // Add the original filename
      };
    } catch (error) {
      console.error('Error during face detection:', error);
      setFiles((prev) => {
        const updated = [...prev];
        updated[index].status = 'error';
        return updated;
      });
      return null;
    }
  };

  const startUpload = () => {
    Promise.all(
      files.map((fileObj, index) => {
        if (fileObj.status === 'pending') {
          setFiles((prev) => {
            const updated = [...prev];
            updated[index].status = 'uploading';
            return updated;
          });
          return detectFaces(fileObj, index);
        } else {
          return Promise.resolve(null);
        }
      })
    ).then((results) => {
      // Filter out null results
      const detectionResults = results.filter((result) => result !== null);

      // Fixed navigation path to match routes.js configuration
      navigate('/components/face/detections', { state: { detectionResults } });
    });
  };

  const removeFile = (index) => {
    setFiles((prev) => {
      const fileToRemove = prev[index];
      if (fileToRemove.preview && fileToRemove.preview.startsWith('blob:')) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  useEffect(() => {
    return () => {
      files.forEach((fileObj) => {
        if (fileObj.preview && fileObj.preview.startsWith('blob:')) {
          URL.revokeObjectURL(fileObj.preview);
        }
      });
    };
  }, [files]);

  return (
    <CCard className="text-center p-4">
      <CCardTitle className="d-flex justify-content-between align-items-center">
        <span>Image Upload</span>
      </CCardTitle>
      <CCardBody>
        <div
          {...getRootProps()}
          className="rounded-2xl p-5 cursor-pointer mb-3"
          style={{
            border: isDragActive ? '3px dashed #0d6efd' : '5px dashed #6261cc',
          }}
        >
          <input {...getInputProps()} />
          <i className="bi bi-folder-fill fs-1 text-primary mb-2"></i>
          {isDragActive ? (
            <p>Drop images here...</p>
          ) : (
            <p>Drag & drop images here, or click to select</p>
          )}
          <Images size={48} color="#6261cc" className="mb-2" />
        </div>

        {files.length > 0 && (
          <>
            <CButton
              color="primary"
              onClick={startUpload}
              className="mb-3"
            >
              Start Upload
            </CButton>

            <CListGroup className="mb-3 text-start">
              <CRow>
                {files.map((fileObj, index) => (
                  <CCol md={6} key={index} className="mb-3">
                    <CListGroupItem className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center flex-grow-1">
                        <img
                          src={fileObj.preview}
                          alt="preview"
                          width={50}
                          height={50}
                          className="rounded me-3 object-fit-cover"
                        />
                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                          <div 
                            style={{ 
                              whiteSpace: 'nowrap', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis',
                              maxWidth: '180px'
                            }}
                          >
                            {fileObj.file.name.length > 25 ? (
                              <CTooltip content={fileObj.file.name}>
                                <strong style={{ cursor: 'help' }}>
                                  {fileObj.file.name}
                                </strong>
                              </CTooltip>
                            ) : (
                              <strong>{fileObj.file.name}</strong>
                            )}
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                            {(fileObj.file.size / 1024).toFixed(2)} KB
                          </div>
                          <div className="mt-1">
                            {fileObj.status === 'uploading' && (
                              <div className="d-flex align-items-center">
                                <CSpinner size="sm" className="me-2" />
                                <small className="text-muted">Processing...</small>
                              </div>
                            )}
                            {fileObj.status === 'done' && (
                              <div className="d-flex align-items-center">
                                <span className="text-success me-2">✅</span>
                                <small className="text-success">Complete</small>
                              </div>
                            )}
                            {fileObj.status === 'error' && (
                              <div className="d-flex align-items-center">
                                <span className="text-danger me-2">❌</span>
                                <small className="text-danger">Error</small>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="d-flex align-items-center ms-2">
                        <CCloseButton onClick={() => removeFile(index)} />
                      </div>
                    </CListGroupItem>
                  </CCol>
                ))}
              </CRow>
            </CListGroup>
          </>
        )}
      </CCardBody>
    </CCard>
  );
};

export default FaceSearch;
