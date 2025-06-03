import { deepCopy, generateUniqueId } from './utils.js';
import { defaultConfig } from './constants.js';
import { createNewTerrainInstance, createOrUpdateTerrainInstance } from './terrain.js';
import { loadAndPlaceSavedObjects, placeObjects } from './objects.js';
import { renderWorldTerrainList, updateUIForActiveTerrain } from './ui.js';

// These should be set up in main.js or terrain.js and attached to window for global access
let worldTerrains = window.worldTerrains || [];
let camera = window.camera;
let controls = window.controls;

/**
 * Sets the active terrain by index or terrain object.
 * Always updates window.activeTerrainIndex and triggers UI updates.
 * @param {number|object} idxOrTerrain - Index or terrain object to set active
 */
function setActiveTerrain(idxOrTerrain) {
    let idx = -1;
    if (typeof idxOrTerrain === 'number') {
        idx = idxOrTerrain;
    } else if (typeof idxOrTerrain === 'object' && idxOrTerrain && Array.isArray(window.worldTerrains)) {
        idx = window.worldTerrains.indexOf(idxOrTerrain);
    }
    if (idx < 0 || idx >= window.worldTerrains.length) {
        window.activeTerrainIndex = -1;
        console.warn('[DEBUG] setActiveTerrain: Invalid index, no active terrain.');
    } else {
        window.activeTerrainIndex = idx;
        const t = window.worldTerrains[idx];
        // Enhanced debug log: show id, offset, and full terrain object
        console.log('[DEBUG] setActiveTerrain: Now active:', {
            index: idx,
            id: t?.id,
            offset: t?.offset,
            terrain: t
        });
    }
    updateUIForActiveTerrain();
    renderWorldTerrainList();
}

// Update getActiveTerrain to always use window.activeTerrainIndex
function getActiveTerrain() {
    if (!Array.isArray(window.worldTerrains)) window.worldTerrains = [];
    if (window.worldTerrains.length === 0) {
        const defaultTerrain = createNewTerrainInstance('t_auto', defaultConfig, { x: 0, y: 0, z: 0 });
        window.worldTerrains.push(defaultTerrain);
        setActiveTerrain(0);
    }
    const idx = typeof window.activeTerrainIndex === 'number' ? window.activeTerrainIndex : 0;
    if (idx < 0 || idx >= window.worldTerrains.length) return window.worldTerrains[0];
    return window.worldTerrains[idx];
}

function setWorldTerrains(arr) {
    window.worldTerrains = arr;
    worldTerrains = arr;
}

function showLoading() {
    const el = document.getElementById('loading-indicator');
    if (el) el.style.display = 'block';
}
function hideLoading() {
    const el = document.getElementById('loading-indicator');
    if (el) el.style.display = 'none';
}
function triggerJSONDownload(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

export function saveActiveTerrainData() {
    // --- Sync offset input fields to terrain instance before saving ---
    const activeTerrain = getActiveTerrain();
    if (activeTerrain) {
        ['x', 'y', 'z'].forEach(axis => {
            const input = document.querySelector(`#worldTerrainList input[type='number'][data-axis='${axis}']`);
            if (input) {
                const val = parseFloat(input.value);
                if (!isNaN(val)) {
                    activeTerrain.offset[axis] = val;
                }
            }
        });
        console.log('[DEBUG] Synced offset from UI before save:', activeTerrain.offset);
    }
    const activeTerrain2 = getActiveTerrain();
    console.log('[DEBUG] saveActiveTerrainData called. Active terrain:', activeTerrain2);
    if (!activeTerrain2 || !activeTerrain2.geometryData) {
        console.warn('[DEBUG] No active terrain or terrain data to save.');
        alert('No active terrain or terrain data to save.');
        return;
    }
    const savedData = {
        version: '1.3',
        id: activeTerrain2.id,
        config: deepCopy(activeTerrain2.config),
        toolSettings: deepCopy(activeTerrain2.toolSettings),
        offset: deepCopy(activeTerrain2.offset),
        geometry: deepCopy(activeTerrain2.geometryData),
        placedObjects: deepCopy(activeTerrain2.placedObjectsData),
        cameraState: camera && controls ? {
            position: camera.position.toArray(),
            target: controls.target.toArray()
        } : undefined
    };
    console.log('[DEBUG] Saving active terrain data:', savedData);
    triggerJSONDownload(savedData, `terrain_s_${activeTerrain2.id.substring(0, 5)}_${Date.now()}.json`);
}

export function saveWorldData() {
    // Always use the latest worldTerrains from window
    const worldTerrainsArr = Array.isArray(window.worldTerrains) ? window.worldTerrains : [];
    console.log('[DEBUG] saveWorldData called. World terrains:', worldTerrainsArr);
    const worldDataTerrains = worldTerrainsArr.map(terrain => ({
        id: terrain.id,
        config: deepCopy(terrain.config),
        toolSettings: deepCopy(terrain.toolSettings),
        offset: deepCopy(terrain.offset),
        geometryData: deepCopy(terrain.geometryData),
        placedObjectsData: deepCopy(terrain.placedObjectsData)
    }));
    const savedData = {
        version: 'world-1.2',
        gridConfig: deepCopy(defaultConfig),
        worldTerrains: worldDataTerrains,
        cameraState: camera && controls ? {
            position: camera.position.toArray(),
            target: controls.target.toArray()
        } : undefined,
        activeTerrainIndex: typeof window.activeTerrainIndex === 'number' ? window.activeTerrainIndex : 0
    };
    console.log('[DEBUG] Saving world data:', savedData);
    triggerJSONDownload(savedData, `world_grid_${Date.now()}.world.json`);
}

function disposeTerrainInstance(terrain) {
    terrain.mesh?.parent?.remove(terrain.mesh);
    terrain.mesh?.geometry?.dispose();
    terrain.mesh?.material?.dispose();
    terrain.waterMesh?.parent?.remove(terrain.waterMesh);
    terrain.waterMesh?.geometry?.dispose();
    terrain.waterMesh?.material?.dispose();
    terrain.objectsGroup?.parent?.remove(terrain.objectsGroup);
    // Add more disposal as needed for other mesh types
}

export { disposeTerrainInstance };

export async function loadWorldData(event) {
    const file = event.target.files[0];
    if (!file) return;
    showLoading();
    try {
        console.log('[DEBUG] loadWorldData called. File:', file);
        const text = await file.text();
        const loadedWorld = JSON.parse(text);
        console.log('[DEBUG] Loaded world data:', loadedWorld);
        if (!loadedWorld.worldTerrains || !Array.isArray(loadedWorld.worldTerrains)) {
            throw new Error("Invalid world file format: missing 'worldTerrains' array.");
        }
        worldTerrains.forEach(disposeTerrainInstance);
        setWorldTerrains([]);
        setActiveTerrain(-1);
        if (loadedWorld.gridConfig) {
            Object.assign(defaultConfig, loadedWorld.gridConfig);
        }
        loadedWorld.worldTerrains.forEach((terrainData, idx) => {
            const newId = terrainData.id || generateUniqueId(`lt_${idx}`);
            const newConfig = terrainData.config || defaultConfig;
            const newOffset = terrainData.offset || { x: 0, y: 0, z: 0 };
            const newTerrain = createNewTerrainInstance(newId, newConfig, newOffset);
            newTerrain.toolSettings = terrainData.toolSettings || deepCopy(newTerrain.toolSettings);
            if (terrainData.geometryData) {
                createOrUpdateTerrainInstance(newTerrain, terrainData.geometryData.topSurfacePositions, terrainData.geometryData.terrainTypes);
            }
            if (terrainData.placedObjectsData && Array.isArray(terrainData.placedObjectsData)) {
                loadAndPlaceSavedObjects(newTerrain, terrainData.placedObjectsData);
            } else {
                placeObjects(newTerrain);
            }
            window.worldTerrains.push(newTerrain);
        });
        if (loadedWorld.cameraState && camera && controls) {
            camera.position.fromArray(loadedWorld.cameraState.position);
            controls.target.fromArray(loadedWorld.cameraState.target);
            controls.update();
        }
        let idxToSet;
        if (loadedWorld.activeTerrainIndex !== undefined && loadedWorld.activeTerrainIndex < window.worldTerrains.length) {
            idxToSet = loadedWorld.activeTerrainIndex;
        } else if (window.worldTerrains.length > 0) {
            idxToSet = 0;
        } else {
            idxToSet = -1;
        }
        setActiveTerrain(idxToSet);
        updateUIForActiveTerrain();
        renderWorldTerrainList();
        console.log('[DEBUG] World loaded and UI updated. Active terrain index:', idxToSet);
    } catch (err) {
        console.error('[DEBUG] Error loading world:', err);
        alert(`Error loading world: ${err.message}`);
    } finally {
        hideLoading();
        if (event.target) event.target.value = null;
    }
}

export async function addTerrainFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    showLoading();
    try {
        console.log('[DEBUG] addTerrainFromFile called. File:', file);
        const text = await file.text();
        const loadedData = JSON.parse(text);
        console.log('[DEBUG] Loaded terrain data:', loadedData);
        if (!loadedData.config || !loadedData.geometry) {
            throw new Error("Invalid terrain file format: missing config or geometry data.");
        }
        const newId = loadedData.id || generateUniqueId('t_loaded');
        const newOffset = loadedData.offset || { x: 0, y: 0, z: 0 };
        const newTerrain = createNewTerrainInstance(newId, loadedData.config, newOffset);
        if (loadedData.geometry.topSurfacePositions) {
            createOrUpdateTerrainInstance(newTerrain, loadedData.geometry.topSurfacePositions, loadedData.geometry.terrainTypes);
        }
        newTerrain.toolSettings = loadedData.toolSettings || deepCopy(newTerrain.toolSettings);
        if (loadedData.placedObjects && Array.isArray(loadedData.placedObjects)) {
            loadAndPlaceSavedObjects(newTerrain, loadedData.placedObjects);
        } else {
            placeObjects(newTerrain);
        }
        // Ensure window.worldTerrains is always an array before pushing
        if (!window.worldTerrains) window.worldTerrains = [];
        window.worldTerrains.push(newTerrain);
        setWorldTerrains(window.worldTerrains); // keep local/global in sync
        setActiveTerrain(window.worldTerrains.length - 1);
        updateUIForActiveTerrain();
        renderWorldTerrainList();
        console.log('[DEBUG] Terrain added from file and UI updated. New terrain:', newTerrain);
    } catch (err) {
        console.error('[DEBUG] Error loading terrain from file:', err);
        alert(`Error loading terrain from file: ${err.message}`);
    } finally {
        hideLoading();
        if (event.target) event.target.value = null;
    }
}

// Patch: Add visual feedback and logs for 'Set Active' in terrain UI
function renderWorldTerrainListWithSetActive() {
    const listEl = document.getElementById('worldTerrainList');
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!Array.isArray(window.worldTerrains)) window.worldTerrains = [];
    window.worldTerrains.forEach((terrain, idx) => {
        const div = document.createElement('div');
        div.className = idx === window.activeTerrainIndex ? 'active-terrain-item' : '';
        div.textContent = `T${idx + 1} (${terrain.id})`;
        // Set Active button
        const setActiveBtn = document.createElement('button');
        setActiveBtn.textContent = 'Set Active';
        setActiveBtn.style.marginLeft = '10px';
        setActiveBtn.className = 'secondary';
        if (idx === window.activeTerrainIndex) {
            setActiveBtn.style.backgroundColor = '#61dafb';
            setActiveBtn.style.color = '#1a1a1a';
            setActiveBtn.disabled = true;
        }
        setActiveBtn.onclick = (e) => {
            e.stopPropagation();
            setActiveTerrain(idx);
            setActiveBtn.style.backgroundColor = '#61dafb';
            setActiveBtn.style.color = '#1a1a1a';
            setActiveBtn.disabled = true;
            div.className = 'active-terrain-item';
            console.log('[DEBUG] Set Active button clicked. Index:', idx, 'Terrain:', terrain);
        };
        div.appendChild(setActiveBtn);
        // Clicking the div (not the button) also sets active
        div.onclick = () => {
            setActiveTerrain(idx);
            console.log('[DEBUG] Terrain tile clicked. Index:', idx, 'Terrain:', terrain);
        };
        listEl.appendChild(div);
    });
}
// Replace the original renderWorldTerrainList export with the new one
export { renderWorldTerrainListWithSetActive as renderWorldTerrainList };
export function saveData(type, data) {
    let filename = type === SAVE_LOAD_TYPES.WORLD ? 'world.json' : 'terrain.json';
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

export function loadData(type, callback) {
    let input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = JSON.parse(evt.target.result);
                callback(data);
            } catch (err) {
                // Handle error: show user-friendly message and log error
                alert('Invalid file format. Please select a valid JSON file.');
                console.error('File load error:', err);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}
