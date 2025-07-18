import { useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for managing keyboard shortcuts
 * @param {Object} shortcuts - Object mapping key combinations to callback functions
 * @param {Array} deps - Dependencies array for the callbacks
 * @param {Object} options - Configuration options
 * @returns {Object} - Hook utilities
 */
const useKeyboardShortcuts = (shortcuts = {}, deps = [], options = {}) => {
    const {
        enabled = true,
        preventDefault = true,
        stopPropagation = false,
        target = null, // If null, defaults to document
        caseSensitive = false
    } = options;

    const shortcutsRef = useRef(shortcuts);
    const callbacksRef = useRef({});

    // Update shortcuts ref when shortcuts change
    useEffect(() => {
        shortcutsRef.current = shortcuts;
    }, [shortcuts]);

    // Parse key combination string into components
    const parseKeyCombo = useCallback((combo) => {
        const keys = combo.toLowerCase().split('+').map(k => k.trim());
        return {
            ctrl: keys.includes('ctrl') || keys.includes('control'),
            alt: keys.includes('alt'),
            shift: keys.includes('shift'),
            meta: keys.includes('meta') || keys.includes('cmd'),
            key: keys.find(k => !['ctrl', 'control', 'alt', 'shift', 'meta', 'cmd'].includes(k)) || ''
        };
    }, []);

    // Check if the pressed keys match a shortcut combination
    const matchesCombo = useCallback((event, combo) => {
        const parsed = parseKeyCombo(combo);
        const eventKey = caseSensitive ? event.key : event.key.toLowerCase();
        const targetKey = caseSensitive ? parsed.key : parsed.key.toLowerCase();

        return (
            event.ctrlKey === parsed.ctrl &&
            event.altKey === parsed.alt &&
            event.shiftKey === parsed.shift &&
            event.metaKey === parsed.meta &&
            (eventKey === targetKey || event.code.toLowerCase() === targetKey)
        );
    }, [caseSensitive, parseKeyCombo]);

    // Handle keydown events
    const handleKeyDown = useCallback((event) => {
        if (!enabled) return;

        const shortcuts = shortcutsRef.current;
        
        for (const [combo, callback] of Object.entries(shortcuts)) {
            if (matchesCombo(event, combo)) {
                if (preventDefault) {
                    event.preventDefault();
                }
                if (stopPropagation) {
                    event.stopPropagation();
                }
                
                // Call the callback function
                if (typeof callback === 'function') {
                    callback(event);
                }
                
                // Only trigger the first matching shortcut
                break;
            }
        }
    }, [enabled, preventDefault, stopPropagation, matchesCombo]);

    // Set up event listeners
    useEffect(() => {
        const targetElement = target || document;
        
        if (enabled) {
            targetElement.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            targetElement.removeEventListener('keydown', handleKeyDown);
        };
    }, [enabled, handleKeyDown, target]);

    // Utility functions
    const addShortcut = useCallback((combo, callback) => {
        shortcutsRef.current = {
            ...shortcutsRef.current,
            [combo]: callback
        };
    }, []);

    const removeShortcut = useCallback((combo) => {
        const newShortcuts = { ...shortcutsRef.current };
        delete newShortcuts[combo];
        shortcutsRef.current = newShortcuts;
    }, []);

    const clearShortcuts = useCallback(() => {
        shortcutsRef.current = {};
    }, []);

    const getRegisteredShortcuts = useCallback(() => {
        return Object.keys(shortcutsRef.current);
    }, []);

    return {
        addShortcut,
        removeShortcut,
        clearShortcuts,
        getRegisteredShortcuts,
        isEnabled: enabled
    };
};

export default useKeyboardShortcuts;
