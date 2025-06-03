// Shared constants (terrain types, tool modes, config, etc.)
// Exports: TERRAIN_TYPES, TOOL_MODES, PLACED_OBJECT_TYPES, defaultConfig

export const TERRAIN_TYPES = {
    GRASS: 0,
    SAND: 1,
    ROCK: 2,
    SNOW: 3,
    LAVA: 4,
    GRAVEL: 5
};

export const TOOL_MODES = {
    NONE: 'NONE',
    MOVE_TERRAIN: 'MOVE_TERRAIN',
    SCULPT_RAISE: 'SCULPT_RAISE',
    SCULPT_LOWER: 'SCULPT_LOWER',
    SCULPT_SMOOTH: 'SCULPT_SMOOTH',
    SCULPT_FLATTEN: 'SCULPT_FLATTEN',
    PAINT: 'PAINT',
    PLACE_OBJECT: 'PLACE_OBJECT'
};

export const PLACED_OBJECT_TYPES = {
    TREE: 'TREE',
    ROCK_OBJ: 'ROCK_OBJ'
};

export const SELECTION_MODES = {
    NONE: 'NONE',
    SINGLE: 'SINGLE',
    RECTANGLE: 'RECTANGLE',
    LASSO: 'LASSO',
    BRUSH: 'BRUSH'
};

export const TERRAIN_CONTEXT_KEYS = {
    HEIGHT: 'height',
    TYPE: 'type',
    OBJECTS: 'objects',
    SELECTED: 'selected',
    METADATA: 'metadata'
};

export const SAVE_LOAD_TYPES = {
    WORLD: 'WORLD',
    TERRAIN: 'TERRAIN'
};

export const defaultConfig = {
    terrainWidth: 200,
    terrainDepth: 200,
    segments: 100,
    terrainThickness: 10,
    noiseScale: 70,
    terrainHeightScale: 30,
    octaves: 4,
    persistence: 0.5,
    lacunarity: 2.0,
    plateauLevel: 0.0,
    plateauSmoothing: 0.1,
    valleyDepthFactor: 1.5,
    valleyThreshold: -0.2,
    waterLevel: 0,
    treePlacementProbability: 0.02,
    rockPlacementProbability: 0.01,
    gridCellSize: 10,
    gridDisplaySize: 1000,
    showGrid: true,
    snapYToGrid: false,
    gridColorCenter: '#444444',
    gridColorLines: '#888888',
    gridOpacity: 0.2
};
