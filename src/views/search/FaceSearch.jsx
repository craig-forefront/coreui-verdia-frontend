import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  CCard,
  CCardBody,
  CCardTitle,
  CProgress,
  CButton,
  CListGroup,
  CListGroupItem,
  CCloseButton,
  CSpinner,
} from '@coreui/react';
import { useNavigate } from 'react-router-dom';
import { Images } from 'lucide-react';
import axios from 'axios';

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
      console.log(`Sending request for ${fileObj.file.name} to API...`);
      const response = await axios.post('http://localhost:8000/detect/faces/detect/image', formData, {
        headers: {
          'X-API-Key': `_Zwptd64P3sOd9Dt02c9xBAJ5PU1MUyz0zv21f4uhzY`,
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
      
      console.log(`API Response for ${fileObj.file.name}:`, {
        status: response.status,
        statusText: response.statusText,
        dataStructure: Object.keys(response.data),
        hasFaces: response.data.faces ? response.data.faces.length : 'No faces property',
        hasImageData: !!response.data.imageData,
      });
      
      setFiles((prev) => {
        const updated = [...prev];
        updated[index].status = 'done';
        updated[index].progress = 100;
        return updated;
      });
      // Return the response data with preview URL
      return {
        ...response.data,
        imagePreviewUrl: fileObj.preview,  // Add the preview URL to the response
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
      console.log('All uploads and face detections completed');
      console.log('Raw API results:', results);
      
      // Filter out null results
      const detectionResults = results.filter((result) => result !== null);
      console.log('Filtered detectionResults:', detectionResults);
      console.log('DetectionResults structure:', {
        type: typeof detectionResults,
        isArray: Array.isArray(detectionResults),
        length: detectionResults.length,
        firstItem: detectionResults.length > 0 ? 
          {
            keys: Object.keys(detectionResults[0]),
            hasFaces: detectionResults[0].faces ? 'yes' : 'no',
            hasImageData: detectionResults[0].imageData ? 'yes' : 'no',
            hasPreviewUrl: detectionResults[0].imagePreviewUrl ? 'yes' : 'no',
          } : 'No items'
      });
      
      // Fixed navigation path to match routes.js configuration
      console.log('Navigating to /theme/faces/detections with state:', { state: { detectionResults } });
      navigate('/theme/faces/detections', { state: { detectionResults } });
    });
  };

  const removeFile = (index) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  useEffect(() => {
    return () => {
      files.forEach((fileObj) => URL.revokeObjectURL(fileObj.preview));
    };
  }, [files]);

  return (
    <CCard className="text-center p-4">
      <CCardTitle>Image Upload</CCardTitle>
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

            <CListGroup className="mb-3 text-start">``
              {files.map((fileObj, index) => (
                <CListGroupItem
                  key={index}
                  className="d-flex align-items-center justify-content-between"
                >
                  <div className="d-flex align-items-center">
                    <img
                      src={fileObj.preview}
                      alt="preview"
                      width={50}
                      height={50}
                      className="rounded me-3 object-fit-cover"
                    />
                    <div>
                      <strong>{fileObj.file.name}</strong>
                      <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                        {(fileObj.file.size / 1024).toFixed(2)} KB
                      </div>
                      <div style={{ width: '200px' }}>
                        <CProgress
                          className="mt-1"
                          value={fileObj.progress}
                          color={
                            fileObj.status === 'done'
                              ? 'success'
                              : fileObj.status === 'error'
                                ? 'danger'
                                : 'primary'
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center">
                    {fileObj.status === 'uploading' && <CSpinner size="sm" className="me-2" />}
                    {fileObj.status === 'done' && <span className="text-success me-2">✔️</span>}
                    <CCloseButton onClick={() => removeFile(index)} />
                  </div>
                </CListGroupItem>
              ))}
            </CListGroup>
          </>
        )}
      </CCardBody>
    </CCard>
  );
};

export default FaceSearch;
