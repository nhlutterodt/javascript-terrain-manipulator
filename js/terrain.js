import { getToolState, renderWorldTerrainList, updateUIForActiveTerrain } from './ui.js';
import { loadAndPlaceSavedObjects } from './objects.js';
import { defaultConfig, TOOL_MODES, TERRAIN_CONTEXT_KEYS } from './constants.js';

// Make THREE available in module scope for ES6 modules
let THREE;
if (typeof window !== 'undefined' && typeof window.THREE !== 'undefined') {
    THREE = window.THREE;
}

// --- Three.js Core Scene State ---
let scene, camera, renderer, controls, worldGroup, gridHelperVisual, groundPlane, simplex;

// Terrain creation, manipulation, and rendering logic
// Exports: createNewTerrainInstance, createOrUpdateTerrainInstance, getNoise, etc.

export function createNewTerrainInstance(id, initialConfig, initialOffset) {
    if (!THREE) return undefined;
    const width = initialConfig.terrainWidth || 200;
    const depth = initialConfig.terrainDepth || 200;
    const segments = initialConfig.segments || 100;
    const noiseScale = initialConfig.noiseScale || 70;
    const heightScale = initialConfig.terrainHeightScale || 30;
    const octaves = initialConfig.octaves || 4;
    const persistence = initialConfig.persistence || 0.5;
    const lacunarity = initialConfig.lacunarity || 2.0;
    // Generate procedural heights
    const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    const pos = geometry.attributes.position;
    const numVertices = pos.count;
    const topSurfacePositions = new Array(numVertices * 3);
    const terrainTypes = new Array(numVertices);
    for (let i = 0; i < numVertices; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        // Normalize x/z to [0,1] for noise
        const nx = (x + width / 2) / width;
        const nz = (z + depth / 2) / depth;
        let y = 0;
        let freq = 1;
        let amp = 1;
        let maxAmp = 0;
        for (let o = 0; o < octaves; o++) {
            y += simplex.noise2D(nx * noiseScale * freq, nz * noiseScale * freq) * amp;
            maxAmp += amp;
            amp *= persistence;
            freq *= lacunarity;
        }
        y = (y / maxAmp) * heightScale;
        pos.setY(i, y);
        // Store top surface position
        topSurfacePositions[i * 3] = x;
        topSurfacePositions[i * 3 + 1] = y;
        topSurfacePositions[i * 3 + 2] = z;
        // Assign terrain type by height
        if (y < (initialConfig.waterLevel || 0) + 2) terrainTypes[i] = 1; // sand
        else if (y < heightScale * 0.5) terrainTypes[i] = 0; // grass
        else if (y < heightScale * 0.8) terrainTypes[i] = 2; // rock
        else terrainTypes[i] = 3; // snow
    }
    geometry.computeVertexNormals();
    // Vertex color by height
    const colors = [];
    for (let i = 0; i < numVertices; i++) {
        const y = pos.getY(i);
        let color;
        if (y < (initialConfig.waterLevel || 0) + 2) color = new THREE.Color(0xC2B280); // sand
        else if (y < heightScale * 0.5) color = new THREE.Color(0x559955); // grass
        else if (y < heightScale * 0.8) color = new THREE.Color(0x888888); // rock
        else color = new THREE.Color(0xffffff); // snow
        colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.8, metalness: 0.2 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(initialOffset.x, 0, initialOffset.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // Water mesh
    const waterGeometry = new THREE.PlaneGeometry(width * 1.5, depth * 1.5, 1, 1);
    waterGeometry.rotateX(-Math.PI / 2);
    const waterMaterial = new THREE.MeshStandardMaterial({ color: 0x336699, transparent: true, opacity: 0.7 });
    const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
    waterMesh.position.set(initialOffset.x, initialConfig.waterLevel || 0, initialOffset.z);
    // --- Ensure geometryData is set ---
    const geometryData = {
        topSurfacePositions: Array.from(topSurfacePositions),
        terrainTypes: Array.from(terrainTypes)
    };
    const instance = {
        id,
        config: { ...initialConfig },
        offset: { ...initialOffset },
        mesh,
        waterMesh,
        geometryData,
        placedObjectsData: [],
        toolSettings: {},
    };
    // Debug log
    if (typeof window !== 'undefined') {
        console.log('[DEBUG] createNewTerrainInstance geometryData:', geometryData);
    }
    return instance;
}

export function createOrUpdateTerrainInstance(terrainInstance, loadedTopSurfacePositions = null, loadedTerrainTypes = null) {
    if (!terrainInstance) return;
    // Regenerate mesh using config and offset
    const newInstance = createNewTerrainInstance(terrainInstance.id, terrainInstance.config, terrainInstance.offset);
    terrainInstance.mesh = newInstance.mesh;
    terrainInstance.waterMesh = newInstance.waterMesh;
    // If loaded geometry is provided, overwrite geometryData
    if (loadedTopSurfacePositions && loadedTerrainTypes) {
        terrainInstance.geometryData = {
            topSurfacePositions: Array.from(loadedTopSurfacePositions),
            terrainTypes: Array.from(loadedTerrainTypes)
        };
    } else {
        terrainInstance.geometryData = newInstance.geometryData;
    }
    // Debug log
    if (typeof window !== 'undefined') {
        console.log('[DEBUG] createOrUpdateTerrainInstance geometryData:', terrainInstance.geometryData);
    }
}

// Regenerates the given terrain instance (mesh and water) in-place
export function regenerateActiveTerrain(terrainInstance) {
    // If not provided, use the currently active terrain
    if (!terrainInstance) {
        const idx = window.activeTerrainIndex ?? 0;
        terrainInstance = window.worldTerrains?.[idx];
    }
    if (!terrainInstance) return;
    // Remove old mesh/water from worldGroup
    terrainInstance.mesh?.parent?.remove(terrainInstance.mesh);
    terrainInstance.waterMesh?.parent?.remove(terrainInstance.waterMesh);
    // Regenerate mesh and water
    createOrUpdateTerrainInstance(terrainInstance);
    // Add new mesh/water to worldGroup
    if (terrainInstance.mesh) worldGroup.add(terrainInstance.mesh);
    if (terrainInstance.waterMesh) worldGroup.add(terrainInstance.waterMesh);
    // Optionally re-place objects (if you want procedural objects to regenerate)
    // placeObjects(terrainInstance);
    // If you want to preserve placed objects, reload them
    if (terrainInstance.placedObjectsData) {
        loadAndPlaceSavedObjects(terrainInstance, terrainInstance.placedObjectsData);
    }
    updateUIForActiveTerrain();
    renderWorldTerrainList();
}

// Example: handle terrain interaction (to be called from event handlers)
export function handleTerrainInteraction(terrainInstance, worldPosition) {
    const toolState = getToolState();
    if (!terrainInstance?.mesh) return;
    const geometry = terrainInstance.mesh.geometry;
    const pos = geometry.attributes.position;
    const colors = geometry.attributes.color;
    const brushSize = toolState.brushSize || 10;
    const sculptStrength = toolState.sculptStrength || 0.5;
    // Find affected vertices within brush radius
    for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        const vz = pos.getZ(i);
        const dx = vx - worldPosition.x;
        const dz = vz - worldPosition.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist <= brushSize) {
            // Sculpting
            if (
                toolState.currentToolMode === TOOL_MODES.SCULPT_RAISE ||
                toolState.currentToolMode === TOOL_MODES.SCULPT_LOWER ||
                toolState.currentToolMode === TOOL_MODES.SCULPT_SMOOTH ||
                toolState.currentToolMode === TOOL_MODES.SCULPT_FLATTEN
            ) {
                let newY = vy;
                if (toolState.currentToolMode === TOOL_MODES.SCULPT_RAISE) {
                    newY += sculptStrength * (1 - dist / brushSize);
                } else if (toolState.currentToolMode === TOOL_MODES.SCULPT_LOWER) {
                    newY -= sculptStrength * (1 - dist / brushSize);
                } else if (toolState.currentToolMode === TOOL_MODES.SCULPT_FLATTEN) {
                    newY += ((worldPosition.y - vy) * 0.5) * (1 - dist / brushSize);
                } else if (toolState.currentToolMode === TOOL_MODES.SCULPT_SMOOTH) {
                    // Average with neighbors (simple smooth)
                    let sum = 0, count = 0;
                    for (let j = 0; j < pos.count; j++) {
                        const nx = pos.getX(j);
                        const nz = pos.getZ(j);
                        const d2 = Math.sqrt((vx - nx) ** 2 + (vz - nz) ** 2);
                        if (d2 < brushSize * 0.5) {
                            sum += pos.getY(j);
                            count++;
                        }
                    }
                    if (count > 0) newY = (sum / count) * (1 - dist / brushSize) + vy * (dist / brushSize);
                }
                pos.setY(i, newY);
            }
            // Painting
            if (toolState.currentToolMode === TOOL_MODES.PAINT) {
                // Set color based on paint type
                let color;
                switch (toolState.currentPaintType) {
                    case 0: color = new THREE.Color(0x559955); break; // grass
                    case 1: color = new THREE.Color(0xC2B280); break; // sand
                    case 2: color = new THREE.Color(0x888888); break; // rock
                    case 3: color = new THREE.Color(0xffffff); break; // snow
                    case 4: color = new THREE.Color(0xFF4500); break; // lava
                    case 5: color = new THREE.Color(0xA9A9A9); break; // gravel
                    default: color = new THREE.Color(0x559955); break;
                }
                colors.setXYZ(i, color.r, color.g, color.b);
            }
        }
    }
    pos.needsUpdate = true;
    if (colors) colors.needsUpdate = true;
    geometry.computeVertexNormals();
}

let isInteracting = false;
let lastMouseEvent = null;

// --- Initialization Functions ---
export function init() {
    if (typeof THREE === 'undefined') {
        console.error('THREE.js not loaded!');
        return;
    }
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(80, 80, 80);
    camera.lookAt(0, 0, 0);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);
    worldGroup = new THREE.Group();
    scene.add(worldGroup);
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.set(2048, 2048);
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -200;
    directionalLight.shadow.camera.right = 200;
    directionalLight.shadow.camera.top = 200;
    directionalLight.shadow.camera.bottom = -200;
    scene.add(directionalLight);
    // Controls
    if (THREE.OrbitControls) {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = true;
        controls.minDistance = 20;
        controls.maxDistance = 500;
        controls.target.set(0, 0, 0);
        controls.update();
    } else {
        console.warn('OrbitControls not found. Camera will not be interactive.');
    }
    updateGridHelper();
    groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    if (typeof window.SimplexNoise === 'function') {
        simplex = new window.SimplexNoise();
    } else {
        simplex = { noise2D: () => 0 };
        console.warn('SimplexNoise not loaded. Terrain will be flat.');
    }
    // Initial world state
    createDefaultWorld();
    // Event listeners
    window.addEventListener('resize', onWindowResize);
    // --- Mouse event handlers for terrain manipulation ---
    if (renderer?.domElement) {
        renderer.domElement.addEventListener('mousedown', (event) => {
            isInteracting = true;
            lastMouseEvent = event;
            handleTerrainMouseEvent(event, 'mousedown');
        });
        renderer.domElement.addEventListener('mousemove', (event) => {
            if (isInteracting) {
                lastMouseEvent = event;
                handleTerrainMouseEvent(event, 'mousemove');
            }
        });
        renderer.domElement.addEventListener('mouseup', (event) => {
            isInteracting = false;
            lastMouseEvent = event;
            handleTerrainMouseEvent(event, 'mouseup');
        });
        renderer.domElement.addEventListener('dblclick', (event) => {
            handleTerrainMouseEvent(event, 'dblclick');
        });
        renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());
    }
    animate();
}

function handleTerrainMouseEvent(event, type) {
    // Raycast to terrain mesh
    const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    // Use the currently active terrain
    const idx = window.activeTerrainIndex ?? 0;
    const terrainInstance = window.worldTerrains?.[idx];
    if (!terrainInstance?.mesh) return;
    const intersects = raycaster.intersectObject(terrainInstance.mesh);
    if (intersects.length > 0) {
        const worldPosition = intersects[0].point;
        if (type === 'mousedown' || type === 'mousemove') {
            handleTerrainInteraction(terrainInstance, worldPosition);
        } else if (type === 'dblclick') {
            // Focus camera on clicked point
            controls.target.copy(worldPosition);
            controls.update();
        }
    }
}

function updateGridHelper() {
    if (gridHelperVisual) {
        scene.remove(gridHelperVisual);
        gridHelperVisual = null;
    }
    gridHelperVisual = new THREE.GridHelper(1000, 100, 0x444444, 0x888888);
    gridHelperVisual.material.opacity = 0.2;
    gridHelperVisual.material.transparent = true;
    scene.add(gridHelperVisual);
}

function onWindowResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
        // Debug: log camera and scene info occasionally
        if (performance.now() % 2000 < 20) {
            console.log('Rendering frame. Camera:', camera.position, 'Scene children:', scene.children);
        }
    }
}

function createDefaultWorld() {
    const newTerrain = createNewTerrainInstance('t_init', defaultConfig, { x: 0, y: 0, z: 0 });
    if (!newTerrain?.mesh) {
        console.error('createDefaultWorld: Terrain mesh was not created!', newTerrain);
    } else {
        console.log('createDefaultWorld: Terrain mesh created:', newTerrain.mesh);
    }
    createOrUpdateTerrainInstance(newTerrain);
    worldGroup.add(newTerrain.mesh);
    if (newTerrain.waterMesh) worldGroup.add(newTerrain.waterMesh);
    console.log('createDefaultWorld: Mesh and waterMesh added to worldGroup. worldGroup children:', worldGroup.children);
    // Minimal-diff: Ensure the initial terrain is added to window.worldTerrains and UI is updated
    if (!window.worldTerrains) window.worldTerrains = [];
    window.worldTerrains.push(newTerrain);
    window.activeTerrainIndex = 0;
    renderWorldTerrainList();
    updateUIForActiveTerrain();
}

// Selection context helpers
export function getCellContext(cell) {
    return {
        [TERRAIN_CONTEXT_KEYS.HEIGHT]: cell.height,
        [TERRAIN_CONTEXT_KEYS.TYPE]: cell.type,
        [TERRAIN_CONTEXT_KEYS.OBJECTS]: cell.objects,
        [TERRAIN_CONTEXT_KEYS.SELECTED]: cell.selected,
        [TERRAIN_CONTEXT_KEYS.METADATA]: cell.metadata || {}
    };
}

export function setCellContext(cell, context) {
    if (TERRAIN_CONTEXT_KEYS.HEIGHT in context) cell.height = context[TERRAIN_CONTEXT_KEYS.HEIGHT];
    if (TERRAIN_CONTEXT_KEYS.TYPE in context) cell.type = context[TERRAIN_CONTEXT_KEYS.TYPE];
    if (TERRAIN_CONTEXT_KEYS.OBJECTS in context) cell.objects = context[TERRAIN_CONTEXT_KEYS.OBJECTS];
    if (TERRAIN_CONTEXT_KEYS.SELECTED in context) cell.selected = context[TERRAIN_CONTEXT_KEYS.SELECTED];
    if (TERRAIN_CONTEXT_KEYS.METADATA in context) cell.metadata = context[TERRAIN_CONTEXT_KEYS.METADATA];
}

// Helper to get world position for a terrain cell
export function getWorldPositionForCell(cell) {
    let x = 0;
    let z = 0;
    if (cell.x !== undefined) {
        x = cell.x;
    } else if (cell.i !== undefined) {
        x = cell.i * defaultConfig.gridCellSize;
    }
    if (cell.z !== undefined) {
        z = cell.z;
    } else if (cell.j !== undefined) {
        z = cell.j * defaultConfig.gridCellSize;
    }
    const y = cell.height !== undefined ? cell.height : 0;
    return { x, y, z };
}

// --- Add debug logging for all UI interactions ---
// Patch UI event handlers to log actions

// Utility to wrap a function with a debug log
function withDebugLog(fn, label) {
    return function(...args) {
        console.log(`[UI DEBUG] ${label}`, ...args);
        return fn.apply(this, args);
    };
}

// Patch slider, button, and other UI event handlers after DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    // Log all button clicks
    document.querySelectorAll('button').forEach(btn => {
        const orig = btn.onclick;
        btn.onclick = function(e) {
            console.log(`[UI DEBUG] Button clicked: ${btn.textContent.trim()}`);
            if (orig) return orig.call(this, e);
        };
    });
    // Log all slider (input[type=range]) changes
    document.querySelectorAll('input[type=range]').forEach(slider => {
        const orig = slider.oninput;
        slider.oninput = function(e) {
            console.log(`[UI DEBUG] Slider changed: name=${slider.name||slider.id}, value=${slider.value}`);
            if (orig) return orig.call(this, e);
        };
    });
    // Log all select changes
    document.querySelectorAll('select').forEach(sel => {
        const orig = sel.onchange;
        sel.onchange = function(e) {
            console.log(`[UI DEBUG] Select changed: name=${sel.name||sel.id}, value=${sel.value}`);
            if (orig) return orig.call(this, e);
        };
    });
    // Log all checkbox changes
    document.querySelectorAll('input[type=checkbox]').forEach(cb => {
        const orig = cb.onchange;
        cb.onchange = function(e) {
            console.log(`[UI DEBUG] Checkbox changed: name=${cb.name||cb.id}, checked=${cb.checked}`);
            if (orig) return orig.call(this, e);
        };
    });
    // Log all text input changes
    document.querySelectorAll('input[type=text], input[type=number]').forEach(inp => {
        const orig = inp.onchange;
        inp.onchange = function(e) {
            console.log(`[UI DEBUG] Input changed: name=${inp.name||inp.id}, value=${inp.value}`);
            if (orig) return orig.call(this, e);
        };
    });
});
