import React, { useState, useEffect } from 'react'
import {
    CCard,
    CCardHeader,
    CCardText,
    CCardImage,
    CPlaceholder
} from '@coreui/react'

// ProbeCard Component
const ProbeCard = React.memo(({ probe }) => {
    const [imageLoaded, setImageLoaded] = useState(false)

    // Force image preloading
    useEffect(() => {
        if (!probe) return;
        
        const img = new Image();
        img.src = probe;
        
        // Set loaded when complete or on error
        img.onload = () => setImageLoaded(true);
        img.onerror = () => setImageLoaded(true);
        
        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [probe]);

    return (
        <CCard className="h-100">
            <CCardHeader className="text-center">
                <strong>Probe</strong>
            </CCardHeader>

            {!imageLoaded ? (
                <div style={{ height: '120px', padding: '8px' }}>
                    <CPlaceholder component="div" animation="glow" className="w-100 h-100">
                        <CPlaceholder xs={12} style={{ height: '100%' }} />
                    </CPlaceholder>
                </div>
            ) : (
                <div style={{ padding: '8px', height: '120px' }}>
                    <img
                        src={probe}
                        alt="Probe"
                        style={{
                            height: '100%',
                            width: '100%',
                            objectFit: 'cover'
                        }}
                    />
                </div>
            )}

            <CCardText className="text-center text-middle">Candidate ID</CCardText>
        </CCard>
    )
});

export default ProbeCard;