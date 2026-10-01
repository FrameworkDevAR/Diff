import * as App      from "./App.js";
import * as Files    from "./actions/Files.js";
import * as Changes  from "./actions/Changes.js";
import * as Settings from "./actions/Settings.js";
import * as History  from "./actions/History.js";
import * as Keys     from "./actions/Keys.js";
import Utils         from "./core/Utils.js";



/**
 * Puts everything back the way it was left, unless the address asks for a
 * diff, which is then the one to show
 * @returns {Void}
 */
function start() {
    App.configs.apply();
    Keys.showKeys();
    Settings.restoreTheme();
    Files.openAddress(true);
}



/**
 * The Click Event Handler
 */
document.addEventListener("click", (e) => {
    const target = Utils.getTarget(e);
    const action = target.dataset.action;
    const side   = App.inputs.getSide(target);

    switch (action) {
    // File Actions
    case "compare-files":
        Files.compareFiles();
        break;
    case "edit-files":
        Files.editFiles();
        break;
    case "swap-files":
        Files.swapFiles();
        break;
    case "upload-file":
        Files.uploadFile(side);
        break;
    case "clear-file":
        Files.clearFile(side);
        break;
    case "load-example":
        Files.loadExample();
        break;

    // Result Actions
    case "set-layout":
        Changes.setLayout(target.dataset.layout);
        break;
    case "prev-change":
        Changes.prevChange();
        break;
    case "next-change":
        Changes.nextChange();
        break;
    case "map-change":
        Changes.goToChange(target);
        break;
    case "pick-change":
        Changes.pickChange(target);
        break;
    case "toggle-check":
        Changes.toggleCheck(target);
        break;
    case "copy-patch":
        Changes.copyPatch();
        break;
    case "expand-fold":
        Changes.expandFold(target);
        break;

    // History Actions
    case "open-history":
        History.openHistory();
        break;
    case "close-history":
        App.historyDialog.close();
        break;
    case "open-entry":
        History.openEntry(Number(target.dataset.entry));
        break;
    case "remove-entry":
        History.removeEntry(Number(target.dataset.entry));
        break;
    case "clear-recent":
        History.clearRecent();
        break;
    case "open-save":
        History.openSave();
        break;
    case "close-save":
        App.saver.close();
        break;
    case "save-entry":
        History.saveEntry();
        break;
    case "forget-entry":
        History.forgetEntry();
        break;

    // Settings Actions
    case "toggle-wrap":
        Settings.toggleSetting("wrapLines");
        break;
    case "toggle-fold":
        Settings.toggleSetting("hideSame");
        break;
    case "open-settings":
        App.settings.open();
        break;
    case "settings-tab":
        App.settings.setTab(target);
        break;
    case "close-settings":
        App.settings.close();
        break;
    case "save-settings":
        Settings.saveSettings();
        break;

    // Mode Actions
    case "mode-light":
        Settings.setMode("light");
        break;
    case "mode-system":
        Settings.setMode("system");
        break;
    case "mode-dark":
        Settings.setMode("dark");
        break;
    default:
    }

    if (action) {
        e.preventDefault();
    }
});

/**
 * The Submit Event Handler. Enter in a field of a Dialog is the button of
 * the Dialog, not the form going anywhere
 */
document.addEventListener("submit", (e) => {
    e.preventDefault();
    if (e.target instanceof HTMLElement) {
        const button = e.target.querySelector(".btn-fill");
        if (button instanceof HTMLElement) {
            button.click();
        }
    }
});

/**
 * The Typing Event Handler
 */
for (const area of document.querySelectorAll(".input textarea")) {
    area.addEventListener("input", () => {
        Files.keepFile(App.inputs.getSide(area), true);
    });
}

/**
 * The Drag Event Handlers. A file dragged over a card lights the card up,
 * and one dropped anywhere is put in
 */
document.addEventListener("dragover", (e) => {
    if (!e.dataTransfer || !e.dataTransfer.types.includes("Files")) {
        return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    App.inputs.setDragging(App.inputs.getSide(e.target), true);
});
document.addEventListener("dragleave", (e) => {
    // Leaving the window is the only leave that ends the drag, since going
    // from one element to another leaves the first
    if (!e.relatedTarget) {
        App.inputs.setDragging("", false);
    }
});
document.addEventListener("drop", (e) => {
    if (!e.dataTransfer || !e.dataTransfer.files.length) {
        return;
    }
    e.preventDefault();
    App.inputs.setDragging("", false);

    // Dropping while the result is shown is asking to compare the new files
    const side = App.inputs.getSide(e.target);
    Files.dropFiles(side, e.dataTransfer.files).then(() => {
        if (document.body.classList.contains("is-result")) {
            Files.compareFiles();
        }
    });
});

/**
 * The Tooltip Event Handler
 */
document.addEventListener("mouseover", (e) => {
    App.tooltip.follow(e);
});

/**
 * The Scroll Event Handler
 */
document.querySelector(".result-scroll").addEventListener("scroll", () => {
    App.tooltip.hide();
});

/**
 * The Wheel Event Handler. The result only scrolls down on its own, so a
 * wheel that goes sideways is handed to the bar that moves the lines along
 */
document.querySelector(".result-scroll").addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        App.result.scrollBy(e.deltaX);
    }
}, { passive : true });

/**
 * The Address Event Handler. Going back and forward, and a link opened
 * while the page is already open, change the address under the page, which
 * then shows what the new one asks for
 */
window.addEventListener("popstate", () => {
    Files.openAddress();
});

/**
 * The Key Event Handler
 */
document.addEventListener("keydown", (e) => {
    if (Keys.handleKey(e)) {
        e.preventDefault();
    }
});



// Start
start();
