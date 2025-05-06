import React, { useState, useEffect, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import {
    CCard,
    CCardBody,
    CCardFooter,
    CBadge,
    CButton,
    CCardTitle,
    CCardText
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilFace, cilImage } from '@coreui/icons';
import { ItemTypes } from '../../utils/faceUtils';
import { hashStringToColor } from '../../utils/faceUtils';
import usePresignedUrls from '../../hooks/usePresignedUrls';

/**
 * Draggable card component for displaying face groups
 */
const FaceGroupCard = ({ group, index, moveGroup, showDetail }) => {
    const ref = useRef(null);
    const [isVisible, setIsVisible] = useState(false);
    const [faceImages, setFaceImages] = useState([]);
    const { getPresignedUrl, urlCache } = usePresignedUrls([], () => {});
    
    // Set up intersection observer to detect when card becomes visible
    useEffect(() => {
        const options = {
            root: null, // viewport
            rootMargin: '100px', // load images slightly before they appear
            threshold: 0.1 // trigger when 10% of element is visible
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    // Once visible, disconnect observer
                    observer.disconnect();
                }
            });
        }, options);
        
        if (ref.current) {
            observer.observe(ref.current);
        }
        
        return () => {
            observer.disconnect();
        };
    }, []);

    // Process images when the group changes or visibility changes
    useEffect(() => {
        const processImages = async () => {
            if (isVisible && group) {
                const images = await getStackImages();
                setFaceImages(images);
            }
        };
        
        processImages();
    }, [isVisible, group, urlCache]);
    
    // Set up drag functionality
    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.FACE_GROUP,
        item: { id: group.id, index },
        collect: (monitor) => ({
            isDragging: monitor.isDragging()
        })
    });

    // Set up drop functionality
    const [, drop] = useDrop({
        accept: ItemTypes.FACE_GROUP,
        hover: (item, monitor) => {
            if (!ref.current) {
                return;
            }
            const dragIndex = item.index;
            const hoverIndex = index;

            // Don't replace items with themselves
            if (dragIndex === hoverIndex) {
                return;
            }

            // Call the move function
            moveGroup(dragIndex, hoverIndex);

            // Update the index for the dragged item
            item.index = hoverIndex;
        }
    });

    // Connect drag and drop refs
    drag(drop(ref));

    // Get the images to display in the stack
    const getStackImages = async () => {
        // Get up to 3 images for the stack
        let images = [];
        
        // If we have faces with URLs
        if (group.faces && group.faces.length > 0) {
            // Try to get up to 3 faces with image URLs
            const processFaces = [];
            
            for (let i = 0; i < Math.min(3, group.faces.length); i++) {
                const face = group.faces[i];
                processFaces.push(face);
            }
            
            for (const face of processFaces) {
                let imageUrl = null;
                
                // Try to get a presigned URL
                if (face.presigned_url && face.presigned_url.startsWith('http')) {
                    imageUrl = face.presigned_url;
                } else if (face.image_url) {
                    // Get a presigned URL for this image path
                    imageUrl = await getPresignedUrl(face.image_url);
                }
                
                if (imageUrl) {
                    images.push({
                        id: `${group.id}-${face.id}`,
                        src: imageUrl,
                        alt: `Face from group ${group.id}`
                    });
                }
            }
        }
        
        // If we don't have enough images, use representative image as the first one
        if (images.length === 0) {
            let repImageUrl = null;
            
            if (group.representative_image_url && group.representative_image_url.startsWith('http')) {
                repImageUrl = group.representative_image_url;
            } else if (group.representative_image) {
                // Get a presigned URL for the representative image
                repImageUrl = await getPresignedUrl(group.representative_image);
            }
            
            if (repImageUrl) {
                images.push({
                    id: `${group.id}-rep`,
                    src: repImageUrl,
                    alt: `Representative face from group ${group.id}`
                });
            }
        }
        
        return images;
    };
    
    // Function to render representative face image for each face group
    const renderFaceGroupImage = () => {
        // Common image wrapper styles
        const imageWrapperStyle = {
            height: '140px',
            borderRadius: '4px',
            position: 'relative',
            padding: '10px', // Add padding to give space for rotated elements
            opacity: isDragging ? 0.4 : 1
        };

        // Common image count badge
        const renderCountBadge = () => {
            if (group.face_count > 3) {
                return (
                    <div 
                        style={{
                            position: 'absolute',
                            bottom: '5px',
                            right: '5px',
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            zIndex: 5 // Make sure badge appears above images
                        }}
                    >
                        +{group.face_count - 3}
                    </div>
                );
            }
            return null;
        };
        
        // If we have images to display in a stack
        if (faceImages.length > 0) {
            return (
                <div style={imageWrapperStyle}>
                    {/* Display images in a stack */}
                    {faceImages.length > 1 ? (
                        <div className="stacked-photos-container" style={{ 
                            width: '100%', 
                            height: '100%', 
                            position: 'relative',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}>
                            {faceImages.map((image, idx) => {
                                // Enhanced rotation angles for better visual effect
                                const rotation = idx === 0 ? 2 : (idx % 2 === 0 ? -8 : 8);
                                const translateY = idx * -2;
                                const zIndex = faceImages.length - idx;
                                
                                // Calculate different sizes for each image in stack 
                                // Back images will be LARGER than front images for better visibility
                                // This creates a "fanned out" appearance
                                const sizePercent = 90 + ((faceImages.length - idx - 1) * 4);
                                
                                return (
                                    <div 
                                        key={image.id} 
                                        style={{
                                            position: 'absolute',
                                            width: `${sizePercent}%`, // Back images are larger
                                            height: `${sizePercent}%`, // Back images are larger
                                            transform: `rotate(${rotation}deg) translateY(${translateY}px)`,
                                            zIndex,
                                            cursor: 'pointer',
                                            borderRadius: '4px',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                            border: '2px solid white' // Add border for better separation
                                        }}
                                        onClick={() => showDetail(group.id)}
                                    >
                                        {isVisible && (
                                            <img 
                                                src={image.src} 
                                                alt={image.alt} 
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                    objectPosition: 'center',
                                                    borderRadius: '2px'
                                                }}
                                                onError={(e) => {
                                                    // If image doesn't load, hide it
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        isVisible && (
                            <img 
                                src={faceImages[0].src}
                                alt={faceImages[0].alt}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                                onClick={() => showDetail(group.id)}
                                onError={(e) => {
                                    // If image doesn't load, hide it
                                    e.target.style.display = 'none';
                                }}
                            />
                        )
                    )}
                    
                    {/* Count badge */}
                    {renderCountBadge()}
                </div>
            );
        } else {
            // Fallback to colored placeholder if no image is available
            const colorHash = hashStringToColor(group.id);
            return (
                <div
                    className="face-group-placeholder"
                    style={{
                        backgroundColor: colorHash,
                        height: '140px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '24px',
                        position: 'relative',
                        overflow: 'hidden',
                        opacity: isDragging ? 0.4 : 1
                    }}
                >
                    <CIcon icon={cilFace} size="xl" />
                    {/* Create a "pile" effect with stacked elements */}
                    {Array.from({ length: Math.min(3, Math.floor(group.face_count / 2)) }).map((_, i) => (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                backgroundColor: colorHash,
                                width: '95%',
                                height: '95%',
                                borderRadius: '4px',
                                zIndex: -i - 1,
                                transform: `rotate(${(i + 1) * 5}deg) translateY(${(i + 1) * 3}px)`
                            }}
                        />
                    ))}
                    
                    {/* Count badge */}
                    {renderCountBadge()}
                </div>
            );
        }
    };

    return (
        <div ref={ref}>
            <CCard 
                className="h-100 mb-4" 
                style={{ cursor: 'move' }}
                tabIndex="0"
                onKeyDown={(e) => {
                    // Allow card activation with Enter or Space key
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        showDetail(group.id);
                    }
                }}
                aria-label={`Face group ${group.customName || `Group ${group.id}`} with ${group.face_count} faces`}
            >
                {renderFaceGroupImage()}
                <CCardBody>
                    <CCardTitle>{group.customName || `Group ${group.id}`}</CCardTitle>
                    <CCardText>
                        <CBadge color="primary" shape="rounded-pill" className="me-2">
                            {group.face_count} faces
                        </CBadge>
                        <CBadge color="info" shape="rounded-pill">
                            {(group.confidence * 100).toFixed(1)}% confidence
                        </CBadge>
                    </CCardText>
                </CCardBody>
                <CCardFooter>
                    <CButton
                        color="light"
                        size="sm"
                        className="text-primary"
                        onClick={() => showDetail(group.id)}
                    >
                        <CIcon icon={cilImage} className="me-1" /> View All Faces
                    </CButton>
                </CCardFooter>
            </CCard>
        </div>
    );
};

export default FaceGroupCard;