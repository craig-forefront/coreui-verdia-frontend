import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for managing modal states and interactions
 * @param {Object} options - Configuration options
 * @returns {Object} - Modal state and management functions
 */
const useModal = (options = {}) => {
    const {
        initialOpen = false,
        onOpen = () => {},
        onClose = () => {},
        closeOnEscape = true,
        closeOnOutsideClick = false,
        preventBodyScroll = true
    } = options;

    const [isOpen, setIsOpen] = useState(initialOpen);
    const [data, setData] = useState(null);

    const open = useCallback((modalData = null) => {
        setData(modalData);
        setIsOpen(true);
        onOpen(modalData);
        
        if (preventBodyScroll) {
            document.body.style.overflow = 'hidden';
        }
    }, [onOpen, preventBodyScroll]);

    const close = useCallback(() => {
        setIsOpen(false);
        onClose(data);
        setData(null);
        
        if (preventBodyScroll) {
            document.body.style.overflow = '';
        }
    }, [onClose, data, preventBodyScroll]);

    const toggle = useCallback((modalData = null) => {
        if (isOpen) {
            close();
        } else {
            open(modalData);
        }
    }, [isOpen, open, close]);

    // Handle keyboard events
    useEffect(() => {
        if (!isOpen || !closeOnEscape) return;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                close();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, closeOnEscape, close]);

    // Handle outside clicks
    useEffect(() => {
        if (!isOpen || !closeOnOutsideClick) return;

        const handleClickOutside = (event) => {
            // Check if click is on modal backdrop
            if (event.target.classList.contains('modal-backdrop') || 
                event.target.classList.contains('modal')) {
                close();
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [isOpen, closeOnOutsideClick, close]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (preventBodyScroll) {
                document.body.style.overflow = '';
            }
        };
    }, [preventBodyScroll]);

    return {
        isOpen,
        data,
        open,
        close,
        toggle,
        setData
    };
};

/**
 * Hook for managing multiple modals
 * @param {Array} modalNames - Array of modal identifiers
 * @returns {Object} - Multiple modal states and functions
 */
export const useMultipleModals = (modalNames = []) => {
    const [modals, setModals] = useState(() => {
        const initialState = {};
        modalNames.forEach(name => {
            initialState[name] = { isOpen: false, data: null };
        });
        return initialState;
    });

    const openModal = useCallback((modalName, data = null) => {
        setModals(prev => ({
            ...prev,
            [modalName]: { isOpen: true, data }
        }));
    }, []);

    const closeModal = useCallback((modalName) => {
        setModals(prev => ({
            ...prev,
            [modalName]: { isOpen: false, data: null }
        }));
    }, []);

    const toggleModal = useCallback((modalName, data = null) => {
        setModals(prev => ({
            ...prev,
            [modalName]: {
                isOpen: !prev[modalName]?.isOpen,
                data: prev[modalName]?.isOpen ? null : data
            }
        }));
    }, []);

    const closeAllModals = useCallback(() => {
        setModals(prev => {
            const newState = {};
            Object.keys(prev).forEach(key => {
                newState[key] = { isOpen: false, data: null };
            });
            return newState;
        });
    }, []);

    // Generate helper functions for each modal
    const modalHelpers = {};
    modalNames.forEach(name => {
        modalHelpers[name] = {
            isOpen: modals[name]?.isOpen || false,
            data: modals[name]?.data || null,
            open: (data) => openModal(name, data),
            close: () => closeModal(name),
            toggle: (data) => toggleModal(name, data)
        };
    });

    return {
        modals,
        openModal,
        closeModal,
        toggleModal,
        closeAllModals,
        ...modalHelpers
    };
};

export default useModal;
