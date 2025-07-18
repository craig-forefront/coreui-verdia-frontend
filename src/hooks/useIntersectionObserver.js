import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom hook for Intersection Observer functionality
 * @param {Object} options - Intersection Observer options
 * @returns {Object} - Ref, visibility state, and utilities
 */
const useIntersectionObserver = (options = {}) => {
    const {
        threshold = 0.1,
        rootMargin = '0px',
        root = null,
        triggerOnce = false,
        skip = false
    } = options;

    const elementRef = useRef(null);
    const [isIntersecting, setIsIntersecting] = useState(false);
    const [hasIntersected, setHasIntersected] = useState(false);

    const callback = useCallback((entries) => {
        const [entry] = entries;
        const isCurrentlyIntersecting = entry.isIntersecting;
        
        setIsIntersecting(isCurrentlyIntersecting);
        
        if (isCurrentlyIntersecting && !hasIntersected) {
            setHasIntersected(true);
        }
    }, [hasIntersected]);

    useEffect(() => {
        if (skip) return;

        const element = elementRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(callback, {
            threshold,
            rootMargin,
            root
        });

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [callback, threshold, rootMargin, root, skip]);

    // If triggerOnce is true and element has intersected, disconnect observer
    useEffect(() => {
        if (triggerOnce && hasIntersected) {
            const element = elementRef.current;
            if (element) {
                // We can't access the observer from here, so we just mark it as done
                // The visibility state will remain true
            }
        }
    }, [triggerOnce, hasIntersected]);

    return {
        ref: elementRef,
        isIntersecting: triggerOnce ? hasIntersected : isIntersecting,
        hasIntersected
    };
};

/**
 * Hook specifically for lazy loading images or content
 * @param {Object} options - Lazy loading options
 * @returns {Object} - Ref, visibility state, and loading utilities
 */
export const useLazyLoading = (options = {}) => {
    const {
        rootMargin = '100px', // Load slightly before entering viewport
        threshold = 0.1,
        ...restOptions
    } = options;

    const { ref, isIntersecting, hasIntersected } = useIntersectionObserver({
        rootMargin,
        threshold,
        triggerOnce: true,
        ...restOptions
    });

    const [isLoaded, setIsLoaded] = useState(false);

    // Auto-set loaded when intersecting (for simple use cases)
    useEffect(() => {
        if (isIntersecting && !isLoaded) {
            setIsLoaded(true);
        }
    }, [isIntersecting, isLoaded]);

    return {
        ref,
        isVisible: isIntersecting,
        hasBeenVisible: hasIntersected,
        isLoaded,
        setIsLoaded,
        shouldLoad: isIntersecting
    };
};

/**
 * Hook for infinite scrolling functionality
 * @param {Function} loadMore - Function to call when trigger element is visible
 * @param {Object} options - Configuration options
 * @returns {Object} - Ref for trigger element and loading state
 */
export const useInfiniteScroll = (loadMore, options = {}) => {
    const {
        hasNextPage = true,
        isLoading = false,
        rootMargin = '100px',
        threshold = 1.0,
        ...restOptions
    } = options;

    const [isFetching, setIsFetching] = useState(false);

    const { ref, isIntersecting } = useIntersectionObserver({
        rootMargin,
        threshold,
        skip: !hasNextPage || isLoading || isFetching,
        ...restOptions
    });

    useEffect(() => {
        if (isIntersecting && hasNextPage && !isLoading && !isFetching) {
            setIsFetching(true);
            
            const executeLoadMore = async () => {
                try {
                    await loadMore();
                } catch (error) {
                    console.error('Error loading more:', error);
                } finally {
                    setIsFetching(false);
                }
            };

            executeLoadMore();
        }
    }, [isIntersecting, hasNextPage, isLoading, isFetching, loadMore]);

    return {
        ref,
        isFetching
    };
};

export default useIntersectionObserver;
