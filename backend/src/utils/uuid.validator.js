/**
 * UUID Validation Utility
 * Provides validation for UUID format to prevent 500 errors from malformed IDs
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check if a value is a valid UUID v4 format
 * @param {string} value - The value to validate
 * @returns {boolean} True if valid UUID, false otherwise
 */
export const isValidUUID = (value) => {
    if (!value || typeof value !== 'string') {
        return false;
    }
    return UUID_REGEX.test(value);
};

/**
 * Validate UUID and throw descriptive error if invalid
 * @param {string} value - The UUID to validate
 * @param {string} fieldName - Name of the field for error message
 * @throws {Error} If UUID is invalid
 */
export const validateUUID = (value, fieldName = 'ID') => {
    if (!isValidUUID(value)) {
        throw new Error(`Invalid ${fieldName} format. Expected valid UUID.`);
    }
};

/**
 * Validate multiple UUIDs at once
 * @param {Object} uuids - Object with fieldName: value pairs
 * @throws {Error} If any UUID is invalid
 */
export const validateUUIDs = (uuids) => {
    for (const [fieldName, value] of Object.entries(uuids)) {
        if (value !== null && value !== undefined) {
            validateUUID(value, fieldName);
        }
    }
};
