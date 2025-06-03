// Utility functions (deep copy, unique ID, etc.)
// Exports: deepCopy, generateUniqueId, etc.

export function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

export function generateUniqueId(prefix = "id") {
    return `${prefix}_${Math.random().toString(36).slice(2, 11)}_${Date.now()}`;
}

// No direct changes needed for constants usage in utils.js, history.js, objects.js, orbitcontrols-loader.js, simplexnoise-loader.js, or lore.js for this feature set.
