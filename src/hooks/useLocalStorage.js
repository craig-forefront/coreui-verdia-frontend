import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for localStorage with automatic JSON serialization
 * @param {string} key - localStorage key
 * @param {*} initialValue - Initial value if key doesn't exist
 * @param {Object} options - Configuration options
 * @returns {Array} - [value, setValue, removeValue, clearStorage]
 */
const useLocalStorage = (key, initialValue, options = {}) => {
    const {
        serialize = JSON.stringify,
        deserialize = JSON.parse,
        syncAcrossTabs = false,
        onError = (error) => console.error('LocalStorage error:', error)
    } = options;

    // Get initial value from localStorage or use provided initial value
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? deserialize(item) : initialValue;
        } catch (error) {
            onError(error);
            return initialValue;
        }
    });

    // Set value in localStorage and state
    const setValue = useCallback((value) => {
        try {
            // Allow value to be a function for functional updates
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            
            if (valueToStore === undefined) {
                window.localStorage.removeItem(key);
            } else {
                window.localStorage.setItem(key, serialize(valueToStore));
            }
        } catch (error) {
            onError(error);
        }
    }, [key, serialize, storedValue, onError]);

    // Remove value from localStorage
    const removeValue = useCallback(() => {
        try {
            window.localStorage.removeItem(key);
            setStoredValue(initialValue);
        } catch (error) {
            onError(error);
        }
    }, [key, initialValue, onError]);

    // Clear all localStorage
    const clearStorage = useCallback(() => {
        try {
            window.localStorage.clear();
            setStoredValue(initialValue);
        } catch (error) {
            onError(error);
        }
    }, [initialValue, onError]);

    // Listen for changes in localStorage (across tabs)
    useEffect(() => {
        if (!syncAcrossTabs) return;

        const handleStorageChange = (e) => {
            if (e.key === key && e.newValue !== null) {
                try {
                    setStoredValue(deserialize(e.newValue));
                } catch (error) {
                    onError(error);
                }
            } else if (e.key === key && e.newValue === null) {
                setStoredValue(initialValue);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [key, deserialize, initialValue, syncAcrossTabs, onError]);

    return [storedValue, setValue, removeValue, clearStorage];
};

/**
 * Hook for managing multiple localStorage keys with a namespace
 * @param {string} namespace - Namespace prefix for keys
 * @param {Object} initialValues - Initial values for keys
 * @returns {Object} - Storage management utilities
 */
export const useNamespacedStorage = (namespace, initialValues = {}) => {
    const [storage, setStorage] = useState(() => {
        const stored = {};
        Object.keys(initialValues).forEach(key => {
            const namespacedKey = `${namespace}_${key}`;
            try {
                const item = window.localStorage.getItem(namespacedKey);
                stored[key] = item ? JSON.parse(item) : initialValues[key];
            } catch (error) {
                console.error(`Error loading ${namespacedKey}:`, error);
                stored[key] = initialValues[key];
            }
        });
        return stored;
    });

    const setValue = useCallback((key, value) => {
        const namespacedKey = `${namespace}_${key}`;
        try {
            const valueToStore = value instanceof Function ? value(storage[key]) : value;
            setStorage(prev => ({ ...prev, [key]: valueToStore }));
            
            if (valueToStore === undefined) {
                window.localStorage.removeItem(namespacedKey);
            } else {
                window.localStorage.setItem(namespacedKey, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.error(`Error setting ${namespacedKey}:`, error);
        }
    }, [namespace, storage]);

    const removeKey = useCallback((key) => {
        const namespacedKey = `${namespace}_${key}`;
        try {
            window.localStorage.removeItem(namespacedKey);
            setStorage(prev => ({ ...prev, [key]: initialValues[key] }));
        } catch (error) {
            console.error(`Error removing ${namespacedKey}:`, error);
        }
    }, [namespace, initialValues]);

    const clearNamespace = useCallback(() => {
        try {
            Object.keys(storage).forEach(key => {
                const namespacedKey = `${namespace}_${key}`;
                window.localStorage.removeItem(namespacedKey);
            });
            setStorage(initialValues);
        } catch (error) {
            console.error(`Error clearing namespace ${namespace}:`, error);
        }
    }, [namespace, storage, initialValues]);

    const exportData = useCallback(() => {
        return { ...storage };
    }, [storage]);

    const importData = useCallback((data) => {
        Object.keys(data).forEach(key => {
            setValue(key, data[key]);
        });
    }, [setValue]);

    return {
        storage,
        setValue,
        removeKey,
        clearNamespace,
        exportData,
        importData,
        // Individual getters/setters for convenience
        ...Object.keys(initialValues).reduce((acc, key) => {
            acc[key] = storage[key];
            acc[`set${key.charAt(0).toUpperCase() + key.slice(1)}`] = (value) => setValue(key, value);
            return acc;
        }, {})
    };
};

/**
 * Hook for localStorage with validation
 * @param {string} key - localStorage key
 * @param {*} initialValue - Initial value
 * @param {Function} validator - Validation function
 * @returns {Array} - [value, setValue, isValid, validationError]
 */
export const useValidatedStorage = (key, initialValue, validator) => {
    const [value, setValue, removeValue, clearStorage] = useLocalStorage(key, initialValue);
    const [validationError, setValidationError] = useState(null);

    const isValid = useCallback((val = value) => {
        try {
            const result = validator(val);
            setValidationError(null);
            return result;
        } catch (error) {
            setValidationError(error.message);
            return false;
        }
    }, [value, validator]);

    const setValidatedValue = useCallback((newValue) => {
        if (isValid(newValue)) {
            setValue(newValue);
        }
    }, [setValue, isValid]);

    return [value, setValidatedValue, isValid(value), validationError, removeValue, clearStorage];
};

export default useLocalStorage;
