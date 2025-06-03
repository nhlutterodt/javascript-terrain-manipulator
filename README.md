# javascript-terrain-manipulator

A 3D procedural world generator and terrain manipulation tool built with JavaScript and Three.js.

## Features

- Generate and sculpt 3D terrains using procedural noise
- Paint terrain types (grass, sand, rock, snow, lava, gravel)
- Place decorative objects (trees, rocks) on the terrain
- Undo/redo terrain changes
- Save and load world/terrain data
- Generate lore (placeholder for Gemini API integration)

## Project Structure

```text
├── terrain_gen_v1.html         # Main entry point (open in browser)
├── styles.css                  # Centralized CSS for UI and layout
├── js/
│   ├── main.js                 # App entry point, initialization, loader
│   ├── terrain.js              # Terrain generation, manipulation, rendering
│   ├── ui.js                   # UI controls, event listeners, DOM updates
│   ├── objects.js              # Decorative object placement (trees, rocks)
│   ├── fileio.js               # Save/load world and terrain data
│   ├── history.js              # Undo/redo state management
│   ├── lore.js                 # Lore generation (placeholder)
│   ├── constants.js            # Shared constants
│   ├── utils.js                # Utility functions
│   ├── orbitcontrols-loader.js # (Obsolete) OrbitControls loader
│   └── simplexnoise-loader.js  # Loads SimplexNoise for procedural generation
├── archive/
│   └── terrain_gen_v1_playtest.html # Older playtest version
```

## Getting Started

1. Open `terrain_gen_v1.html` in your browser (no build step required).
2. Use the controls to generate, sculpt, paint, and decorate terrains.
3. Save or load your world data as needed.

## Requirements

- Modern web browser (Chrome, Firefox, Edge, etc.)
- Internet connection (for loading Three.js and SimplexNoise from CDN)

## Notes

- The `js/orbitcontrols-loader.js` file is obsolete and can be deleted.
- Lore generation is a placeholder for future Gemini API integration.

## License

MIT License
