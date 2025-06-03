import { TOOL_MODES, TERRAIN_TYPES, PLACED_OBJECT_TYPES } from './constants.js';

// UI controls, event listeners, and DOM updates
// Exports: renderWorldTerrainList, updateUIForActiveTerrain, etc.

// Tool state (module-level, not global)
let currentToolMode = TOOL_MODES.NONE;
let currentPaintType = TERRAIN_TYPES.GRASS;
let currentPlaceObjectType = PLACED_OBJECT_TYPES.TREE;
let brushSize = 10;
let sculptStrength = 0.5;
let objectPlacementScale = 1.0;

export function renderWorldTerrainList() {
    const worldTerrains = window.worldTerrains || [];
    const activeTerrainIndex = window.activeTerrainIndex ?? 0;
    const listElement = document.getElementById('worldTerrainList');
    if (!listElement) return;
    listElement.innerHTML = '';
    worldTerrains.forEach((terrain, idx) => {
        const itemDiv = document.createElement('div');
        itemDiv.innerHTML = `<span class="list-item-id">T${idx + 1} (${terrain.id?.substring(0, 8)})</span> `;
        if (idx === activeTerrainIndex) {
            itemDiv.classList.add('active-terrain-item');
        }
        // Offset controls (X, Y, Z)
        ['x', 'y', 'z'].forEach(axis => {
            const label = document.createElement('label');
            label.textContent = `${axis.toUpperCase()}:`;
            const input = document.createElement('input');
            input.type = 'number';
            input.value = terrain.offset?.[axis] ?? 0;
            input.style.width = '60px';
            input.setAttribute('data-axis', axis); // Add data-axis for reliable selection
            input.addEventListener('change', () => {
                terrain.offset[axis] = parseFloat(input.value);
                if (terrain.mesh) terrain.mesh.position[axis] = terrain.offset[axis];
                if (terrain.waterMesh) terrain.waterMesh.position[axis] = terrain.offset[axis];
                if (terrain.objectsGroup) terrain.objectsGroup.position[axis] = terrain.offset[axis];
            });
            itemDiv.appendChild(label);
            itemDiv.appendChild(input);
        });
        // Set Active button
        const setActiveBtn = document.createElement('button');
        setActiveBtn.textContent = 'Set Active';
        setActiveBtn.className = 'world-terrain-button';
        setActiveBtn.onclick = () => {
            window.activeTerrainIndex = idx;
            updateUIForActiveTerrain();
            renderWorldTerrainList();
        };
        itemDiv.appendChild(setActiveBtn);
        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.className = 'world-terrain-button';
        removeBtn.style.backgroundColor = '#f44336';
        removeBtn.onclick = () => {
            window.worldTerrains.splice(idx, 1);
            if (window.activeTerrainIndex >= window.worldTerrains.length) {
                window.activeTerrainIndex = window.worldTerrains.length - 1;
            }
            updateUIForActiveTerrain();
            renderWorldTerrainList();
        };
        itemDiv.appendChild(removeBtn);
        listElement.appendChild(itemDiv);
    });
    // Ensure scrollable if too many terrains
    listElement.style.overflowY = 'auto';
    listElement.style.maxHeight = '150px';
}

export function updateUIForActiveTerrain() {
    // Example: update tool button active state and sliders
    // (This should be expanded as more UI is modularized)
    // Update active tool button
    document.querySelectorAll('.tool-button').forEach(btn => btn.classList.remove('active'));
    let selector = '';
    if (currentToolMode === TOOL_MODES.PAINT) {
        selector = `.tool-button[data-tool="PAINT"][data-type="${Object.keys(TERRAIN_TYPES).find(k => TERRAIN_TYPES[k] === currentPaintType)}"]`;
    } else if (currentToolMode === TOOL_MODES.PLACE_OBJECT) {
        selector = `.tool-button[data-tool="PLACE_OBJECT"][data-object-type="${Object.keys(PLACED_OBJECT_TYPES).find(k => PLACED_OBJECT_TYPES[k] === currentPlaceObjectType)}"]`;
    } else if (currentToolMode !== TOOL_MODES.NONE) {
        selector = `.tool-button[data-tool="${Object.keys(TOOL_MODES).find(k => TOOL_MODES[k] === currentToolMode)}"]`;
    } else {
        selector = '#navigateToolButton';
    }
    const activeBtn = document.querySelector(selector);
    if (activeBtn) activeBtn.classList.add('active');
    // Update object scale slider display
    const scaleVal = document.getElementById('objectPlacementScaleVal');
    if (scaleVal) scaleVal.textContent = objectPlacementScale.toFixed(1);
    // Update brush size and sculpt strength slider displays
    const brushSizeVal = document.getElementById('brushSizeVal');
    if (brushSizeVal) brushSizeVal.textContent = brushSize;
    const sculptStrengthVal = document.getElementById('sculptStrengthVal');
    if (sculptStrengthVal) sculptStrengthVal.textContent = sculptStrength;
    // (Add more UI sync as needed)
}

// Tool and object placement state management (to be implemented)
export function setToolMode(tool, type, objectType) {
    // Set tool mode
    currentToolMode = TOOL_MODES[tool] || TOOL_MODES.NONE;
    if (currentToolMode === TOOL_MODES.PAINT && type) {
        currentPaintType = TERRAIN_TYPES[type];
    } else if (currentToolMode === TOOL_MODES.PLACE_OBJECT && objectType) {
        currentPlaceObjectType = PLACED_OBJECT_TYPES[objectType];
    }
    // Update UI to reflect new tool state
    updateUIForActiveTerrain();
}

// Set object placement scale and update UI
export function setObjectPlacementScale(scale) {
    objectPlacementScale = scale;
    updateUIForActiveTerrain();
}

// Set brush size and update UI
export function setBrushSize(size) {
    brushSize = size;
    updateUIForActiveTerrain();
}

// Set sculpt strength and update UI
export function setSculptStrength(strength) {
    sculptStrength = strength;
    updateUIForActiveTerrain();
}

// Expose tool state for other modules
export function getToolState() {
    return {
        currentToolMode,
        currentPaintType,
        currentPlaceObjectType,
        brushSize,
        sculptStrength,
        objectPlacementScale
    };
}

// UI hooks for selection and save/load
export function updateSelectionModeUI(mode) {
    // Update UI to reflect current selection mode (e.g., highlight button)
    // Minimal diff: just a placeholder for now
}

export function onSelectionModeChange(callback) {
    // Wire up UI controls to call callback with new mode
    // Minimal diff: placeholder
}

export function onTerrainSelect(callback) {
    // Wire up terrain click/drag events to callback
    // Minimal diff: placeholder
}

export function onSaveWorld(callback) {
    // Wire up save world button
    // Minimal diff: placeholder
}

export function onSaveTerrain(callback) {
    // Wire up save terrain button
    // Minimal diff: placeholder
}

export function onLoadWorld(callback) {
    // Wire up load world button
    // Minimal diff: placeholder
}

export function onLoadTerrain(callback) {
    // Wire up load terrain button
    // Minimal diff: placeholder
}

// UI event for tool mode change
export function onToolModeChange(callback) {
    // Example: wire up tool mode dropdown or buttons
    const toolModeSelect = document.getElementById('toolModeSelect');
    if (toolModeSelect) {
        toolModeSelect.addEventListener('change', (e) => {
            callback(e.target.value);
        });
    }
}

// UI event for Set Active button
export function onSetActiveSelection(callback) {
    function attachListeners() {
        const container = document.getElementById('worldTerrainList');
        if (!container) return;
        container.addEventListener('click', (e) => {
            // Match both new and legacy button classes
            const btn = e.target.closest('.btn--action, .world-terrain-button');
            if (btn && btn.textContent.trim() === 'Set Active') {
                const itemDiv = btn.closest('.terrain-list__item, .active-terrain-item');
                if (itemDiv) {
                    const idSpan = itemDiv.querySelector('.list-item-id');
                    const xInput = itemDiv.querySelector('input[name^="terrain-x-"]');
                    const yInput = itemDiv.querySelector('input[name^="terrain-y-"]');
                    const zInput = itemDiv.querySelector('input[name^="terrain-z-"]');
                    const info = {
                        id: idSpan ? idSpan.textContent : undefined,
                        x: xInput ? Number(xInput.value) : undefined,
                        y: yInput ? Number(yInput.value) : undefined,
                        z: zInput ? Number(zInput.value) : undefined
                    };
                    console.log('[UI] Set Active pressed:', info);
                    callback(info);
                }
            }
        });
        console.log('[DEBUG] Set Active button listeners attached to world-terrain list (delegated)');
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachListeners);
    } else {
        attachListeners();
    }
}

// --- Button Click Event/Callback System ---
const buttonClickHandlers = {}

/**
 * Register a callback for a button click by button ID.
 * Multiple callbacks per button are supported.
 * @param {string} buttonId - The DOM id of the button
 * @param {function} callback - The function to call on click
 */
export function registerButtonClickHandler(buttonId, callback) {
    if (!buttonClickHandlers[buttonId]) buttonClickHandlers[buttonId] = [];
    buttonClickHandlers[buttonId].push(callback);
}

/**
 * Internal: Patch all buttons to use the event system and debug log.
 * Call this after DOMContentLoaded.
 */
function patchAllButtonHandlers() {
    const allButtons = document.querySelectorAll('button[id]');
    allButtons.forEach(btn => {
        const origHandler = btn.onclick;
        btn.onclick = function(event) {
            if (typeof window !== 'undefined') {
                console.log(`[DEBUG] Button clicked: #${btn.id}`);
            }
            // Call registered callbacks
            if (buttonClickHandlers[btn.id]) {
                buttonClickHandlers[btn.id].forEach(cb => {
                    try { cb(event); } catch (e) { console.warn(`[DEBUG] Button handler error for #${btn.id}:`, e); }
                });
            }
            // Call original handler if present (for backward compatibility)
            if (typeof origHandler === 'function') origHandler.call(this, event);
        };
    });
}

document.addEventListener('DOMContentLoaded', () => {
    patchAllButtonHandlers();
    if (typeof window !== 'undefined') {
        console.log('[DEBUG] UI button event system initialized');
    }
});
