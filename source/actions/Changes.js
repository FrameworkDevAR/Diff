import * as App   from "../App.js";
import * as Files from "./Files.js";



/**
 * Shows the result in the given layout
 * @param {String} layout
 * @returns {Boolean}
 */
export function setLayout(layout) {
    if (!App.compare || !document.body.classList.contains("is-result")) {
        return false;
    }
    if (layout === "tree" && !App.compare.isJson) {
        App.toast.show("Only two JSON files have a structure");
        return true;
    }

    App.result.setLayout(layout);
    App.bar.setLayout(layout);
    App.storage.setLayout(layout);
    Files.updateStatus();
    return true;
}

/**
 * Walks to the next change
 * @returns {Boolean}
 */
export function nextChange() {
    return walkChanges(1);
}

/**
 * Walks to the change before
 * @returns {Boolean}
 */
export function prevChange() {
    return walkChanges(-1);
}

/**
 * Walks to the change a mark of the map stands for
 * @param {HTMLElement} target
 * @returns {Void}
 */
export function goToChange(target) {
    App.result.goToIndex(Number(target.dataset.hunk));
}

/**
 * Walks the changes by the given step, and says when there are none
 * @param {Number} delta
 * @returns {Boolean}
 */
function walkChanges(delta) {
    if (!App.compare || !document.body.classList.contains("is-result")) {
        return false;
    }
    if (!App.result.goTo(delta)) {
        App.toast.show("There are no changes to walk");
    }
    return true;
}

/**
 * Writes the changes out as a patch and puts it in the clipboard
 * @returns {Boolean}
 */
export function copyPatch() {
    if (!App.compare) {
        App.toast.show("Compare the files first");
        return false;
    }
    if (App.compare.isSame) {
        App.toast.show("There is nothing to put in a patch");
        return true;
    }

    navigator.clipboard.writeText(App.compare.patch()).then(() => {
        App.toast.show("The patch is copied");
    }).catch(() => {
        App.toast.show("The patch could not be copied");
    });
    return true;
}

/**
 * Shows the lines the given fold was hiding
 * @param {HTMLElement} target
 * @returns {Void}
 */
export function expandFold(target) {
    App.result.expandFold(Number(target.dataset.block));
}

/**
 * Opens or closes a branch of the tree
 * @param {HTMLElement} target
 * @returns {Void}
 */
export function toggleNode(target) {
    App.result.toggleNode(target);
}
