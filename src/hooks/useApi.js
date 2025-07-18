import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for API calls with loading states, caching, and error handling
 * @param {Function} apiFunction - Function that makes the API call
 * @param {Object} options - Configuration options
 * @returns {Object} - API state and utilities
 */
const useApi = (apiFunction, options = {}) => {
    const {
        immediate = false,
        initialData = null,
        cacheKey = null,
        cacheTime = 5 * 60 * 1000, // 5 minutes
        retryAttempts = 0,
        retryDelay = 1000,
        onSuccess = () => {},
        onError = () => {},
        transformData = (data) => data
    } = options;

    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastFetch, setLastFetch] = useState(null);
    
    const abortControllerRef = useRef(null);
    const cacheRef = useRef(new Map());

    // Check if cached data is still valid
    const isCacheValid = useCallback((cacheEntry) => {
        if (!cacheEntry) return false;
        return Date.now() - cacheEntry.timestamp < cacheTime;
    }, [cacheTime]);

    // Get data from cache
    const getCachedData = useCallback(() => {
        if (!cacheKey) return null;
        const cached = cacheRef.current.get(cacheKey);
        return isCacheValid(cached) ? cached.data : null;
    }, [cacheKey, isCacheValid]);

    // Set data in cache
    const setCachedData = useCallback((newData) => {
        if (!cacheKey) return;
        cacheRef.current.set(cacheKey, {
            data: newData,
            timestamp: Date.now()
        });
    }, [cacheKey]);

    // Execute API call with retry logic
    const executeWithRetry = useCallback(async (params, attemptCount = 0) => {
        try {
            // Cancel any ongoing request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            // Create new abort controller
            abortControllerRef.current = new AbortController();
            
            const result = await apiFunction({
                ...params,
                signal: abortControllerRef.current.signal
            });
            
            return result;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw error; // Don't retry aborted requests
            }

            if (attemptCount < retryAttempts) {
                console.warn(`API call failed, retrying (${attemptCount + 1}/${retryAttempts})...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay * (attemptCount + 1)));
                return executeWithRetry(params, attemptCount + 1);
            }
            
            throw error;
        }
    }, [apiFunction, retryAttempts, retryDelay]);

    // Main execute function
    const execute = useCallback(async (params = {}) => {
        // Check cache first
        const cachedData = getCachedData();
        if (cachedData) {
            setData(cachedData);
            return cachedData;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await executeWithRetry(params);
            const transformedData = transformData(result);
            
            setData(transformedData);
            setCachedData(transformedData);
            setLastFetch(Date.now());
            onSuccess(transformedData);
            
            return transformedData;
        } catch (error) {
            if (error.name !== 'AbortError') {
                setError(error);
                onError(error);
            }
            throw error;
        } finally {
            setLoading(false);
        }
    }, [getCachedData, executeWithRetry, transformData, setCachedData, onSuccess, onError]);

    // Refresh function (ignores cache)
    const refresh = useCallback(async (params = {}) => {
        if (cacheKey) {
            cacheRef.current.delete(cacheKey);
        }
        return execute(params);
    }, [execute, cacheKey]);

    // Cancel ongoing request
    const cancel = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    }, []);

    // Reset state
    const reset = useCallback(() => {
        cancel();
        setData(initialData);
        setLoading(false);
        setError(null);
        setLastFetch(null);
        if (cacheKey) {
            cacheRef.current.delete(cacheKey);
        }
    }, [cancel, initialData, cacheKey]);

    // Execute immediately if specified
    useEffect(() => {
        if (immediate) {
            execute();
        }

        // Cleanup on unmount
        return () => {
            cancel();
        };
    }, [immediate]); // Only run on mount, not when execute changes

    return {
        data,
        loading,
        error,
        lastFetch,
        execute,
        refresh,
        cancel,
        reset,
        isStale: lastFetch && (Date.now() - lastFetch > cacheTime)
    };
};

/**
 * Hook for paginated API calls
 * @param {Function} apiFunction - API function that accepts page parameters
 * @param {Object} options - Configuration options
 * @returns {Object} - Pagination state and utilities
 */
export const usePaginatedApi = (apiFunction, options = {}) => {
    const {
        initialPage = 1,
        pageSize = 20,
        ...apiOptions
    } = options;

    const [currentPage, setCurrentPage] = useState(initialPage);
    const [allData, setAllData] = useState([]);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    const {
        data: pageData,
        loading,
        error,
        execute: executePage
    } = useApi(apiFunction, {
        ...apiOptions,
        transformData: (response) => {
            // Assume API returns { data: [], totalCount: number, hasMore: boolean }
            return response;
        }
    });

    // Load specific page
    const loadPage = useCallback(async (page = currentPage) => {
        const result = await executePage({
            page,
            pageSize,
            offset: (page - 1) * pageSize
        });

        if (result) {
            if (page === 1) {
                setAllData(result.data || []);
            } else {
                setAllData(prev => [...prev, ...(result.data || [])]);
            }
            
            setHasMore(result.hasMore ?? true);
            setTotalCount(result.totalCount ?? 0);
            setCurrentPage(page);
        }

        return result;
    }, [currentPage, pageSize, executePage]);

    // Load next page
    const loadMore = useCallback(async () => {
        if (hasMore && !loading) {
            return loadPage(currentPage + 1);
        }
    }, [hasMore, loading, currentPage, loadPage]);

    // Reset pagination
    const reset = useCallback(() => {
        setCurrentPage(initialPage);
        setAllData([]);
        setHasMore(true);
        setTotalCount(0);
    }, [initialPage]);

    // Load first page on mount
    useEffect(() => {
        loadPage(1);
    }, []); // Only run on mount

    return {
        data: allData,
        currentPage,
        pageData,
        loading,
        error,
        hasMore,
        totalCount,
        loadPage,
        loadMore,
        reset,
        totalPages: Math.ceil(totalCount / pageSize)
    };
};

/**
 * Hook for mutations (POST, PUT, DELETE)
 * @param {Function} mutationFunction - Function that performs the mutation
 * @param {Object} options - Configuration options
 * @returns {Object} - Mutation state and execute function
 */
export const useMutation = (mutationFunction, options = {}) => {
    const {
        onSuccess = () => {},
        onError = () => {},
        onSettled = () => {}
    } = options;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    const mutate = useCallback(async (variables) => {
        setLoading(true);
        setError(null);

        try {
            const result = await mutationFunction(variables);
            setData(result);
            onSuccess(result, variables);
            return result;
        } catch (error) {
            setError(error);
            onError(error, variables);
            throw error;
        } finally {
            setLoading(false);
            onSettled();
        }
    }, [mutationFunction, onSuccess, onError, onSettled]);

    const reset = useCallback(() => {
        setLoading(false);
        setError(null);
        setData(null);
    }, []);

    return {
        mutate,
        loading,
        error,
        data,
        reset
    };
};

export default useApi;
