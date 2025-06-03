// Undo/redo and state management
// Exports: applyTerrainState, undo, redo, saveStateToHistory
import { deepCopy } from './utils.js';

let historyStack = [];
let redoStack = [];

export function applyTerrainState(state) {
    // This function should apply the given state to the app (to be implemented in integration phase)
    // Placeholder: console.log('Applying state', state);
}

export function undo() {
    if (historyStack.length > 0) {
        const prevState = historyStack.pop();
        redoStack.push(deepCopy(window.appState));
        applyTerrainState(prevState);
    }
}

export function redo() {
    if (redoStack.length > 0) {
        const nextState = redoStack.pop();
        historyStack.push(deepCopy(window.appState));
        applyTerrainState(nextState);
    }
}

export function saveStateToHistory() {
    if (window.appState) {
        historyStack.push(deepCopy(window.appState));
        redoStack = [];
    }
}
