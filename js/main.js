// Entry point for the application
import { handleGenerateLoreClick } from './lore.js';
import { undo, redo } from './history.js';
import { saveActiveTerrainData, saveWorldData, loadWorldData, addTerrainFromFile } from './fileio.js';
import { clearAllPlacedObjects } from './objects.js';
import { regenerateActiveTerrain, handleTerrainInteraction, init } from './terrain.js';
import { setToolMode, setObjectPlacementScale, setBrushSize, setSculptStrength } from './ui.js';
import * as ui from './ui.js';
import * as terrain from './terrain.js';
import { SELECTION_MODES, SAVE_LOAD_TYPES, TOOL_MODES } from './constants.js';

// --- Loader Phase Handling ---
function setAppLoadingSpinnerVisible(visible, label = null) {
    const spinner = document.getElementById('app-loading-spinner');
    if (spinner) spinner.style.display = visible ? 'flex' : 'none';
    if (label) {
        const labelDiv = spinner?.querySelector('.spinner-label');
        if (labelDiv) labelDiv.textContent = label;
    }
}

// Add extensive debug logging to loader
window.onload = () => {
    console.log('[DEBUG] window.onload fired');
    setAppLoadingSpinnerVisible(true, 'Loading 3D Engine...');
    let pollCount = 0;
    function tryInit() {
        pollCount++;
        console.log(`[DEBUG] tryInit poll #${pollCount}`);
        if (!window.THREE) {
            console.log('[DEBUG] window.THREE is NOT defined');
        } else {
            console.log('[DEBUG] window.THREE is defined');
            if (window.THREE.OrbitControls) {
                console.log('[DEBUG] window.THREE.OrbitControls is defined');
            } else {
                console.log('[DEBUG] window.THREE.OrbitControls is NOT defined');
            }
        }
        if (window?.THREE?.OrbitControls) {
            setAppLoadingSpinnerVisible(true, 'Initializing Scene...');
            setTimeout(() => {
                console.log('[DEBUG] Calling init()');
                try {
                    init();
                    console.log('[DEBUG] init() completed');
                } catch (e) {
                    console.error('[DEBUG] Error in init():', e);
                }
                setAppLoadingSpinnerVisible(false);
                console.log('[DEBUG] Spinner hidden after init');
            }, 100);
        } else {
            setTimeout(tryInit, 30);
        }
    }
    tryInit();

    // --- UI Event Wiring ---
    // Lore button
    const loreBtn = document.getElementById('generateLoreButton');
    if (loreBtn) {
        loreBtn.onclick = () => handleGenerateLoreClick();
        console.log('[DEBUG] Lore button event wired');
    }
    // Undo/Redo buttons
    const undoBtn = document.getElementById('undoButton');
    if (undoBtn) undoBtn.onclick = () => undo();
    const redoBtn = document.getElementById('redoButton');
    if (redoBtn) redoBtn.onclick = () => redo();
    // Save/Load Active Terrain
    const saveActiveBtn = document.getElementById('saveActiveTerrainButton');
    if (saveActiveBtn) saveActiveBtn.onclick = () => saveActiveTerrainData();
    // Save/Load World
    const saveWorldBtn = document.getElementById('saveWorldButton');
    if (saveWorldBtn) saveWorldBtn.onclick = () => saveWorldData();
    const loadWorldInput = document.getElementById('loadWorldInput');
    if (loadWorldInput) loadWorldInput.onchange = (e) => loadWorldData(e);
    // Add Terrain From File
    const addTerrainInput = document.getElementById('addTerrainInput');
    if (addTerrainInput) addTerrainInput.onchange = (e) => addTerrainFromFile(e);
    // Clear All Placed Objects
    const clearAllBtn = document.getElementById('clearAllPlacedObjectsButton');
    if (clearAllBtn) {
        clearAllBtn.onclick = () => {
            console.log('[UI] Clear All Placed Objects button pressed');
            clearAllPlacedObjects();
            // Future: emit event or call additional callbacks here if needed
        };
    }
    // Regenerate Active Terrain
    const regenBtn = document.getElementById('regenerateActiveButton');
    if (regenBtn) regenBtn.onclick = () => regenerateActiveTerrain();

    // Tool Selection
    const toolButtons = document.querySelectorAll('.tool-button');
    toolButtons.forEach(button => {
        button.addEventListener('click', () => {
            setToolMode(button.dataset.tool, button.dataset.type, button.dataset.objectType);
        });
    });

    // Object Placement Controls
    const objectScaleInput = document.getElementById('objectPlacementScale');
    if (objectScaleInput) {
        objectScaleInput.addEventListener('input', (e) => {
            setObjectPlacementScale(parseFloat(e.target.value));
        });
    }

    // Brush size and sculpt strength controls
    const brushSizeInput = document.getElementById('brushSize');
    if (brushSizeInput) {
        brushSizeInput.addEventListener('input', (e) => {
            setBrushSize(parseFloat(e.target.value));
        });
    }
    const sculptStrengthInput = document.getElementById('sculptStrength');
    if (sculptStrengthInput) {
        sculptStrengthInput.addEventListener('input', (e) => {
            setSculptStrength(parseFloat(e.target.value));
        });
    }

    // Example: Mouse event handler for terrain interaction (to be called from Three.js or canvas event system)
    // This is a stub; actual event system should call this with the correct terrain instance and world position
    window.handleTerrainInteraction = handleTerrainInteraction;

    // Example: Three.js/canvas event handler integration (replace with your actual renderer logic)
    // This is a template for how to wire up modular interaction:
    //
    // renderer.domElement.addEventListener('mousedown', (event) => {
    //     // Compute world position from event (e.g., using raycasting)
    //     const worldPosition = ...; // Your logic here
    //     const activeTerrain = ...; // Your logic to get the active terrain instance
    //     handleTerrainInteraction(activeTerrain, worldPosition);
    // });
    //
    // You can do the same for mousemove, mouseup, touch events, etc.
    //
    // The modular handleTerrainInteraction will use the current tool state automatically
};

window.onresize = () => {
    // Placeholder for resize logic (to be migrated from old code)
    console.log('[DEBUG] window.onresize fired');
};

// --- Selection Mode Integration ---
let currentSelectionMode = SELECTION_MODES.NONE;
let selectedTerrainCells = [];

function setSelectionMode(mode) {
    if (Object.values(SELECTION_MODES).includes(mode)) {
        currentSelectionMode = mode;
        selectedTerrainCells = [];
        ui.updateSelectionModeUI(mode);
    }
}

function handleTerrainSelection(event) {
    // Use SELECTION_MODES for selection logic
    switch (currentSelectionMode) {
        case SELECTION_MODES.SINGLE:
            selectedTerrainCells = [getCellFromEvent(event)];
            break;
        case SELECTION_MODES.RECTANGLE:
            // Rectangle selection logic
            break;
        case SELECTION_MODES.LASSO:
            // Lasso selection logic
            break;
        case SELECTION_MODES.BRUSH:
            // Brush selection logic
            break;
        default:
            selectedTerrainCells = [];
    }
    terrain.highlightCells(selectedTerrainCells);
    // Set global selectedTerrainCell for Set Active button
    if (selectedTerrainCells.length > 0) {
        window.selectedTerrainCell = selectedTerrainCells[0];
        console.log('[DEBUG] window.selectedTerrainCell set:', window.selectedTerrainCell);
    } else {
        window.selectedTerrainCell = null;
    }
}

// --- Save/Load Integration ---
function saveWorld() {
    fileio.saveData(SAVE_LOAD_TYPES.WORLD, getWorldData());
}

function saveTerrain() {
    fileio.saveData(SAVE_LOAD_TYPES.TERRAIN, getTerrainData());
}

function loadWorld(data) {
    setWorldData(data);
    terrain.refresh();
}

function loadTerrain(data) {
    setTerrainData(data);
    terrain.refresh();
}

// Camera behavior in context of tool use and tool transition
let lastToolMode = TOOL_MODES.NONE;

function handleToolModeChange(newMode) {
    if (newMode !== lastToolMode) {
        // Example: adjust camera controls based on tool
        if (newMode === TOOL_MODES.MOVE_TERRAIN) {
            if (window.THREE && window.THREE.OrbitControls && window.orbitControls) {
                window.orbitControls.enabled = true;
            }
        } else if (window.THREE && window.THREE.OrbitControls && window.orbitControls) {
            window.orbitControls.enabled = false;
        }
        lastToolMode = newMode;
    }
}

// Hook tool mode changes to camera behavior
if (ui.onToolModeChange) {
    ui.onToolModeChange(handleToolModeChange);
}

// Terrain Selection: Set Active button logic
function handleSetActiveSelection(selectedCell) {
    if (!selectedCell) return;
    const worldPos = terrain.getWorldPositionForCell(selectedCell);
    console.log('[UI] Set Active pressed:', {
        cell: selectedCell,
        worldPosition: worldPos
    });
}

if (ui.onSetActiveSelection) {
    ui.onSetActiveSelection(handleSetActiveSelection);
}

// Hook up UI events to new selection/save/load logic
ui.onSelectionModeChange(setSelectionMode);
ui.onTerrainSelect(handleTerrainSelection);
ui.onSaveWorld(saveWorld);
ui.onSaveTerrain(saveTerrain);
ui.onLoadWorld(loadWorld);
ui.onLoadTerrain(loadTerrain);
