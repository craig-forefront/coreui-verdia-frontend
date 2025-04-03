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
import { Folder } from 'lucide-react';


const VectorSearch = () => {
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

  const uploadFile = (fileObj, index) => {
    const interval = setInterval(() => {
      setFiles((prev) => {
        const updated = [...prev];
        if (updated[index].progress >= 100) {
          clearInterval(interval);
          updated[index].status = 'done';
        } else {
          updated[index].progress += 10;
        }
        return updated;
      });
    }, 200);
  };

  const startUpload = () => {
    files.forEach((fileObj, index) => {
      if (fileObj.status === 'pending') {
        setFiles((prev) => {
          const updated = [...prev];
          updated[index].status = 'uploading';
          return updated;
        });
        uploadFile(fileObj, index);
      }
    });
  };

  const removeFile = (index) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  // ✅ Watch for upload completion
  useEffect(() => {
    if (files.length > 0 && files.every((f) => f.status === 'done')) {
      // Delay a bit so user can see 100% progress
      setTimeout(() => {
        navigate('/theme/detections'); // 👈 Change this to your desired route
      }, 800);
    }
  }, [files, navigate]);

  useEffect(() => {
    return () => {
      files.forEach((fileObj) => URL.revokeObjectURL(fileObj.preview));
    };
  }, [files]);

  return (
    <CCard className="text-center p-4">
      <CCardTitle>Face Image Upload</CCardTitle>
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
          <Folder size={48} color="#6261cc" className="mb-2" />
        </div>

        {files.length > 0 && (
          <CListGroup className="mb-3 text-start">
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
                    <CProgress
                      className="mt-1"
                      value={fileObj.progress}
                      color={fileObj.status === 'done' ? 'success' : 'primary'}
                    />
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
        )}

        <CButton color="primary" disabled={!files.length} onClick={startUpload}>
          Start Upload
        </CButton>
      </CCardBody>
    </CCard>
  );
};

export default VectorSearch