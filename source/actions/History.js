import * as App   from "../App.js";
import * as Files from "./Files.js";



// The entry of the History that holds the pair being looked at
let currentID = 0;



/**
 * Keeps the pair that was just compared in the History, and says on the
 * bar whether it is one that was saved
 * @returns {Void}
 */
export function remember() {
    if (!App.compare) {
        return;
    }
    const entry = App.history.remember(App.compare.oldFile, App.compare.newFile, App.compare);
    currentID = entry.id;
    App.bar.setSaved(entry.isPinned);
    Files.setAddress(`#h=${entry.id}`);
}

/**
 * Opens the History
 * @returns {Boolean}
 */
export function openHistory() {
    App.historyDialog.open(App.history.list());
    return true;
}

/**
 * Puts the files of the given entry in, and compares them again
 * @param {Number} id
 * @returns {Void}
 */
export function openEntry(id) {
    const entry = App.history.get(id);
    if (!entry) {
        return;
    }

    App.historyDialog.close();
    Files.showFiles({ name : entry.oldName, text : entry.oldText }, { name : entry.newName, text : entry.newText });
}

/**
 * Removes the given entry, and draws the list again without it
 * @param {Number} id
 * @returns {Void}
 */
export function removeEntry(id) {
    App.history.remove(id);
    if (id === currentID) {
        currentID = 0;
        App.bar.setSaved(false);
    }
    App.historyDialog.render(App.history.list());
}

/**
 * Removes every entry that was not saved
 * @returns {Void}
 */
export function clearRecent() {
    App.history.clearRecent();
    if (currentID && !App.history.get(currentID)) {
        currentID = 0;
    }
    App.historyDialog.render(App.history.list());
    App.toast.show("The recent diffs are gone");
}



/**
 * Opens the Dialog to save the pair being looked at, or to rename it once
 * it is saved
 * @returns {Boolean}
 */
export function openSave() {
    const entry = currentID ? App.history.get(currentID) : null;
    if (!App.compare || !entry) {
        App.toast.show("Compare the files first");
        return false;
    }
    App.saver.open(entry);
    return true;
}

/**
 * Saves the pair being looked at under the name that was typed
 * @returns {Void}
 */
export function saveEntry() {
    const name = App.saver.getName();
    if (!name || !currentID) {
        return;
    }
    App.history.pin(currentID, name);
    App.saver.close();
    App.bar.setSaved(true);
    App.toast.show("The diff is saved");
}

/**
 * Lets the pair being looked at go back among the recent
 * @returns {Void}
 */
export function forgetEntry() {
    if (currentID) {
        App.history.unpin(currentID);
    }
    App.saver.close();
    App.bar.setSaved(false);
    App.toast.show("The diff is no longer saved");
}
