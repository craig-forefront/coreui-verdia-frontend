import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for debouncing values
 * @param {*} value - Value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {*} - Debounced value
 */
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

/**
 * Hook for debounced callbacks
 * @param {Function} callback - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @param {Array} dependencies - Dependencies array
 * @returns {Function} - Debounced callback function
 */
export const useDebounceCallback = (callback, delay, dependencies = []) => {
    const timeoutRef = useRef(null);

    const debouncedCallback = useCallback((...args) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    }, [callback, delay, ...dependencies]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // Cancel function
    const cancel = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    // Flush function (execute immediately)
    const flush = useCallback((...args) => {
        cancel();
        callback(...args);
    }, [callback, cancel]);

    return {
        callback: debouncedCallback,
        cancel,
        flush
    };
};

/**
 * Hook for debounced search functionality
 * @param {Function} searchFunction - Function to execute search
 * @param {number} delay - Debounce delay in milliseconds
 * @param {Object} options - Additional options
 * @returns {Object} - Search state and utilities
 */
export const useDebouncedSearch = (searchFunction, delay = 300, options = {}) => {
    const {
        minLength = 1,
        immediate = false,
        onSearchStart = () => {},
        onSearchEnd = () => {},
        onError = () => {}
    } = options;

    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const debouncedQuery = useDebounce(query, delay);

    // Execute search when debounced query changes
    useEffect(() => {
        const executeSearch = async () => {
            if (debouncedQuery.length < minLength) {
                setResults([]);
                setError(null);
                return;
            }

            setLoading(true);
            setError(null);
            onSearchStart(debouncedQuery);

            try {
                const searchResults = await searchFunction(debouncedQuery);
                setResults(searchResults);
            } catch (err) {
                setError(err);
                setResults([]);
                onError(err);
            } finally {
                setLoading(false);
                onSearchEnd(debouncedQuery);
            }
        };

        if (immediate || debouncedQuery) {
            executeSearch();
        }
    }, [debouncedQuery, searchFunction, minLength, immediate, onSearchStart, onSearchEnd, onError]);

    const clearSearch = useCallback(() => {
        setQuery('');
        setResults([]);
        setError(null);
    }, []);

    return {
        query,
        setQuery,
        results,
        loading,
        error,
        clearSearch,
        debouncedQuery
    };
};

/**
 * Hook for throttling values (rate limiting)
 * @param {*} value - Value to throttle
 * @param {number} interval - Interval in milliseconds
 * @returns {*} - Throttled value
 */
export const useThrottle = (value, interval) => {
    const [throttledValue, setThrottledValue] = useState(value);
    const lastExecuted = useRef(Date.now());

    useEffect(() => {
        if (Date.now() >= lastExecuted.current + interval) {
            lastExecuted.current = Date.now();
            setThrottledValue(value);
        } else {
            const timer = setTimeout(() => {
                lastExecuted.current = Date.now();
                setThrottledValue(value);
            }, interval - (Date.now() - lastExecuted.current));

            return () => clearTimeout(timer);
        }
    }, [value, interval]);

    return throttledValue;
};

/**
 * Hook for throttled callbacks
 * @param {Function} callback - Function to throttle
 * @param {number} interval - Interval in milliseconds
 * @param {Array} dependencies - Dependencies array
 * @returns {Function} - Throttled callback function
 */
export const useThrottleCallback = (callback, interval, dependencies = []) => {
    const lastExecuted = useRef(0);
    const timeoutRef = useRef(null);

    const throttledCallback = useCallback((...args) => {
        const now = Date.now();

        if (now - lastExecuted.current >= interval) {
            lastExecuted.current = now;
            callback(...args);
        } else {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                lastExecuted.current = Date.now();
                callback(...args);
            }, interval - (now - lastExecuted.current));
        }
    }, [callback, interval, ...dependencies]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return throttledCallback;
};

export default useDebounce;
