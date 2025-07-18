import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for handling image loading states and preloading
 * @param {string|Array} imageSrc - Image source URL or array of URLs
 * @param {Object} options - Configuration options
 * @returns {Object} - Loading states and utilities
 */
const useImageLoader = (imageSrc, options = {}) => {
    const {
        placeholder = null,
        onLoad = () => {},
        onError = () => {},
        preload = true,
        timeout = 30000
    } = options;

    const [loadingStates, setLoadingStates] = useState({});
    const [errorStates, setErrorStates] = useState({});
    const [loadedImages, setLoadedImages] = useState({});

    // Helper to normalize src to array
    const normalizeToArray = useCallback((src) => {
        if (!src) return [];
        return Array.isArray(src) ? src : [src];
    }, []);

    // Load a single image
    const loadImage = useCallback((url, key = url) => {
        if (!url) return Promise.reject(new Error('No URL provided'));

        return new Promise((resolve, reject) => {
            // Set loading state
            setLoadingStates(prev => ({ ...prev, [key]: true }));
            setErrorStates(prev => ({ ...prev, [key]: false }));

            const img = new Image();
            let timeoutId;

            const cleanup = () => {
                if (timeoutId) clearTimeout(timeoutId);
                img.onload = null;
                img.onerror = null;
            };

            img.onload = () => {
                cleanup();
                setLoadingStates(prev => ({ ...prev, [key]: false }));
                setLoadedImages(prev => ({ ...prev, [key]: url }));
                onLoad(url, key);
                resolve(url);
            };

            img.onerror = (error) => {
                cleanup();
                setLoadingStates(prev => ({ ...prev, [key]: false }));
                setErrorStates(prev => ({ ...prev, [key]: true }));
                onError(error, key);
                reject(error);
            };

            // Set timeout
            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    cleanup();
                    const timeoutError = new Error(`Image load timeout: ${url}`);
                    setLoadingStates(prev => ({ ...prev, [key]: false }));
                    setErrorStates(prev => ({ ...prev, [key]: true }));
                    onError(timeoutError, key);
                    reject(timeoutError);
                }, timeout);
            }

            img.src = url;
        });
    }, [onLoad, onError, timeout]);

    // Load multiple images
    const loadImages = useCallback(async (urls) => {
        const results = {};
        const promises = urls.map(async (url, index) => {
            const key = `${url}_${index}`;
            try {
                const loadedUrl = await loadImage(url, key);
                results[key] = { success: true, url: loadedUrl };
            } catch (error) {
                results[key] = { success: false, error };
            }
        });

        await Promise.allSettled(promises);
        return results;
    }, [loadImage]);

    // Preload images when src changes
    useEffect(() => {
        if (!preload) return;

        const urls = normalizeToArray(imageSrc);
        if (urls.length === 0) return;

        let isCancelled = false;

        const loadAllImages = async () => {
            for (const url of urls) {
                if (isCancelled) break;
                try {
                    await loadImage(url);
                } catch (error) {
                    // Individual errors are already handled in loadImage
                    console.warn('Failed to preload image:', url, error);
                }
            }
        };

        loadAllImages();

        return () => {
            isCancelled = true;
        };
    }, [imageSrc, preload, loadImage, normalizeToArray]);

    // Get loading state for a specific image
    const isLoading = useCallback((key = imageSrc) => {
        return !!loadingStates[key];
    }, [loadingStates, imageSrc]);

    // Get error state for a specific image
    const hasError = useCallback((key = imageSrc) => {
        return !!errorStates[key];
    }, [errorStates, imageSrc]);

    // Get loaded image URL
    const getLoadedImage = useCallback((key = imageSrc) => {
        return loadedImages[key] || null;
    }, [loadedImages, imageSrc]);

    // Check if any images are loading
    const isAnyLoading = Object.values(loadingStates).some(Boolean);

    // Check if all images are loaded
    const urls = normalizeToArray(imageSrc);
    const allLoaded = urls.length > 0 && urls.every(url => loadedImages[url]);

    return {
        // Loading states
        isLoading,
        hasError,
        isAnyLoading,
        allLoaded,
        
        // Image data
        getLoadedImage,
        loadedImages,
        
        // Methods
        loadImage,
        loadImages,
        
        // Utilities
        preloadImage: loadImage,
        clearCache: useCallback(() => {
            setLoadingStates({});
            setErrorStates({});
            setLoadedImages({});
        }, [])
    };
};

export default useImageLoader;
