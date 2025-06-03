// Decorative object (tree, rock) placement and management
// Exports: placeSingleObject, placeObjects, loadAndPlaceSavedObjects, clearAllPlacedObjects

export function placeSingleObject(terrainInstance, worldPosition, objectType, scaleFactor = 1.0) {
    if (!terrainInstance) return;
    if (!terrainInstance.objectsGroup) {
        terrainInstance.objectsGroup = new THREE.Group();
        terrainInstance.objectsGroup.position.set(
            terrainInstance.offset.x,
            terrainInstance.offset.y,
            terrainInstance.offset.z
        );
        if (typeof window !== 'undefined' && window.worldGroup) {
            window.worldGroup.add(terrainInstance.objectsGroup);
        }
    }
    let mesh = null;
    let objectData = { type: objectType, position: { x: worldPosition.x, y: worldPosition.y, z: worldPosition.z }, scale: {} };
    if (objectType === 'TREE' || objectType === 0) {
        // Tree: BoxGeometry
        const baseHeight = 2 + Math.random() * 3;
        const baseScale = 0.5 + Math.random() * 0.5;
        const treeHeight = baseHeight * scaleFactor;
        const treeScale = baseScale * scaleFactor;
        const treeGeometry = new THREE.BoxGeometry(treeScale, treeHeight, treeScale);
        const treeMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
        mesh = new THREE.Mesh(treeGeometry, treeMaterial);
        mesh.position.set(worldPosition.x, worldPosition.y + treeHeight / 2, worldPosition.z);
        objectData.scale = { x: treeScale, y: treeHeight, z: treeScale };
    } else if (objectType === 'ROCK_OBJ' || objectType === 1) {
        // Rock: SphereGeometry
        const baseRadius = 0.5 + Math.random() * 1;
        const rockRadius = baseRadius * scaleFactor;
        const rockGeometry = new THREE.SphereGeometry(rockRadius, 8, 6);
        const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x696969 });
        mesh = new THREE.Mesh(rockGeometry, rockMaterial);
        mesh.position.set(worldPosition.x, worldPosition.y + rockRadius, worldPosition.z);
        objectData.scale = { radius: rockRadius };
    }
    if (mesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        terrainInstance.objectsGroup.add(mesh);
        if (!terrainInstance.placedObjectsData) terrainInstance.placedObjectsData = [];
        terrainInstance.placedObjectsData.push(objectData);
        if (typeof window !== 'undefined') {
            console.log(`[DEBUG] placeSingleObject: Placed ${objectType} at (${worldPosition.x}, ${worldPosition.y}, ${worldPosition.z}) on terrain ${terrainInstance.id}`);
        }
    }
}

export function placeObjects(terrainInstance) {
    if (!terrainInstance) return;
    if (!terrainInstance.geometryData || !terrainInstance.geometryData.topSurfacePositions || !terrainInstance.geometryData.terrainTypes) {
        console.warn('placeObjects: Missing geometryData');
        return;
    }
    if (!terrainInstance.placedObjectsData) terrainInstance.placedObjectsData = [];
    if (terrainInstance.placedObjectsData.length > 0) {
        console.log(`[DEBUG] placeObjects: Skipping procedural placement for terrain ${terrainInstance.id} (already has objects)`);
        return;
    }
    if (!terrainInstance.objectsGroup) {
        terrainInstance.objectsGroup = new THREE.Group();
        terrainInstance.objectsGroup.position.set(
            terrainInstance.offset.x,
            terrainInstance.offset.y,
            terrainInstance.offset.z
        );
        if (typeof window !== 'undefined' && window.worldGroup) {
            window.worldGroup.add(terrainInstance.objectsGroup);
        }
    }
    const config = terrainInstance.config || {};
    const positions = terrainInstance.geometryData.topSurfacePositions;
    const types = terrainInstance.geometryData.terrainTypes;
    const numVerts = types.length;
    let placedCount = { tree: 0, rock_obj: 0 };
    for (let i = 0; i < numVerts; i++) {
        const type = types[i];
        const x = positions[i * 3];
        const y = positions[i * 3 + 1];
        const z = positions[i * 3 + 2];
        // Place trees on grass, rocks on rock, with probability
        if ((type === 'GRASS' || type === 0) && Math.random() < (config.treePlacementProbability || 0.02)) {
            // Tree
            const worldPos = { x, y, z };
            placeSingleObject(terrainInstance, worldPos, 'TREE', 1.0);
            placedCount.tree++;
        } else if ((type === 'ROCK_OBJ' || type === 2) && Math.random() < (config.rockPlacementProbability || 0.01)) {
            // Rock
            const worldPos = { x, y, z };
            placeSingleObject(terrainInstance, worldPos, 'ROCK_OBJ', 1.0);
            placedCount.rock_obj++;
        }
    }
    if (typeof window !== 'undefined') {
        console.log(`[DEBUG] placeObjects: Procedurally placed on terrain ${terrainInstance.id}: Trees: ${placedCount.tree}, Rocks: ${placedCount.rock_obj}`);
    }
}

export function loadAndPlaceSavedObjects(terrainInstance, savedObjects) {
    if (!terrainInstance) return;
    if (!Array.isArray(savedObjects)) {
        console.warn('loadAndPlaceSavedObjects: savedObjects is not an array');
        return;
    }
    // Ensure objectsGroup exists and is added to worldGroup if available
    if (!terrainInstance.objectsGroup) {
        terrainInstance.objectsGroup = new THREE.Group();
        terrainInstance.objectsGroup.position.set(
            terrainInstance.offset.x,
            terrainInstance.offset.y,
            terrainInstance.offset.z
        );
        if (typeof window !== 'undefined' && window.worldGroup) {
            window.worldGroup.add(terrainInstance.objectsGroup);
        }
    }
    // Remove all existing children
    while (terrainInstance.objectsGroup.children.length > 0) {
        const obj = terrainInstance.objectsGroup.children[0];
        if (obj && obj.parent) obj.parent.remove(obj);
        terrainInstance.objectsGroup.remove(obj);
    }
    terrainInstance.placedObjectsData = [];
    // Place each saved object
    savedObjects.forEach(objectData => {
        let mesh = null;
        if (!objectData || !objectData.type || !objectData.position) return;
        if (objectData.type === 'TREE' || objectData.type === 0) { // Accept both enum and string
            // Tree: BoxGeometry
            const treeHeight = objectData.scale?.y || 3;
            const treeScale = objectData.scale?.x || 0.75;
            const treeGeometry = new THREE.BoxGeometry(treeScale, treeHeight, treeScale);
            const treeMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
            mesh = new THREE.Mesh(treeGeometry, treeMaterial);
        } else if (objectData.type === 'ROCK_OBJ' || objectData.type === 1) {
            // Rock: SphereGeometry
            const rockRadius = objectData.scale?.radius || 1;
            const rockGeometry = new THREE.SphereGeometry(rockRadius, 8, 6);
            const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x696969 });
            mesh = new THREE.Mesh(rockGeometry, rockMaterial);
        }
        if (mesh) {
            mesh.position.set(
                objectData.position.x || 0,
                objectData.position.y || 0,
                objectData.position.z || 0
            );
            // Apply scale if present
            if (objectData.scale?.x && objectData.scale?.y && objectData.scale?.z) {
                mesh.scale.set(objectData.scale.x, objectData.scale.y, objectData.scale.z);
            } else if (objectData.scale?.radius) {
                mesh.scale.set(objectData.scale.radius, objectData.scale.radius, objectData.scale.radius);
            }
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            terrainInstance.objectsGroup.add(mesh);
            terrainInstance.placedObjectsData.push(objectData);
        }
    });
    if (typeof window !== 'undefined') {
        console.log(`[DEBUG] loadAndPlaceSavedObjects: Placed ${terrainInstance.placedObjectsData.length} objects on terrain ${terrainInstance.id}`);
    }
}

export function clearAllPlacedObjects(terrainInstance) {
    if (!terrainInstance || !terrainInstance.objectsGroup) return;
    // Remove all meshes from the group
    while (terrainInstance.objectsGroup.children.length > 0) {
        const obj = terrainInstance.objectsGroup.children[0];
        if (obj && obj.parent) obj.parent.remove(obj);
        terrainInstance.objectsGroup.remove(obj);
    }
    terrainInstance.placedObjectsData = [];
    if (typeof window !== 'undefined') {
        console.log(`[DEBUG] clearAllPlacedObjects: Cleared all objects from terrain ${terrainInstance.id}`);
    }
}
