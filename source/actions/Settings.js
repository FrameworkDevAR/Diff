import * as App   from "../App.js";
import * as Files from "./Files.js";



/**
 * Saves what the Settings Dialog was left at, and compares the files again
 * the new way when they are being compared
 * @returns {Void}
 */
export function saveSettings() {
    const data = App.settings.update();
    if (!data) {
        return;
    }

    App.configs.set(data);
    applySettings();
}

/**
 * Turns the given Setting the other way, from the bar of the result, and
 * shows the files the new way
 * @param {String} name
 * @returns {Boolean}
 */
export function toggleSetting(name) {
    if (!App.compare) {
        return false;
    }
    App.configs.set({ [name] : !App.configs.get(name) });
    applySettings();
    return true;
}

/**
 * Compares the files again the way the Settings ask for, when they are
 * being compared, and lights the buttons of the bar the same way
 * @returns {Void}
 */
export function applySettings() {
    App.bar.setToggles(App.configs.values);
    if (App.compare) {
        App.compare.run(App.configs.values);
        App.result.show(App.compare, App.configs.values, App.result.layout);
        Files.updateStatus();
    }
}

/**
 * Takes the Mode that was last picked, of the three there are
 * @returns {Void}
 */
export function restoreTheme() {
    App.mode.restore(App.storage.getMode());
}

/**
 * Takes the given Mode and keeps it for the next time
 * @param {String} mode
 * @returns {Void}
 */
export function setMode(mode) {
    App.storage.setMode(mode);
    App.mode.restore(mode);
}
