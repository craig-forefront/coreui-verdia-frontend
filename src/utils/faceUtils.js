/**
 * Utility functions for face processing and display
 */

/**
 * Generates a consistent color from a string (like a group ID)
 * @param {string} str - The string to hash
 * @returns {string} - An HSL color string
 */
export const hashStringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = (hash % 360 + 360) % 360;
    return `hsl(${hue}, 65%, 50%)`;
};

// Constants for drag and drop
export const ItemTypes = {
    FACE_GROUP: 'faceGroup'
};