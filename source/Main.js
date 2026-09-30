import * as App      from "./App.js";
import * as Files    from "./actions/Files.js";
import * as Changes  from "./actions/Changes.js";
import * as Settings from "./actions/Settings.js";
import * as Keys     from "./actions/Keys.js";
import Utils         from "./core/Utils.js";



/**
 * Puts everything back the way it was left
 * @returns {Void}
 */
function start() {
    App.configs.apply();
    Keys.showKeys();
    Settings.restoreTheme();
    Files.start();
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
    case "copy-patch":
        Changes.copyPatch();
        break;
    case "expand-fold":
        Changes.expandFold(target);
        break;
    case "toggle-node":
        Changes.toggleNode(target);
        break;

    // Settings Actions
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
 * The Key Event Handler
 */
document.addEventListener("keydown", (e) => {
    if (Keys.handleKey(e)) {
        e.preventDefault();
    }
});



// Start
start();
