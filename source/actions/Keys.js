import * as App     from "../App.js";
import * as Files    from "./Files.js";
import * as Changes  from "./Changes.js";
import * as Settings from "./Settings.js";



// What the keys held with another are called, which is not the same everywhere
const IS_MAC    = navigator.platform.startsWith("Mac");
const MOD_KEY   = IS_MAC ? "⌘" : "Ctrl";
const SHIFT_KEY = IS_MAC ? "⇧" : "Shift";

// Every key the app answers to, said once: the handler reads it, the Settings
// list it, and the tooltip of a button says which key does the same. A name
// of "Mod" is the key that is held, whichever this machine calls it
const SHORTCUTS = [
    {
        names  : [ "Esc" ],
        keys   : [ "escape" ],
        always : true,
        text   : "<b>Close</b> a dialog, or <b>leave</b> the file being typed in",
        run    : closeSomething,
    },
    {
        names   : [ "Mod", "Enter" ],
        keys    : [ "enter" ],
        withKey : true,
        action  : "compare-files",
        text    : "<b>Compare</b> the files",
        run     : Files.compareFiles,
    },
    {
        names   : [ "Mod", "E" ],
        keys    : [ "e" ],
        withKey : true,
        action  : "edit-files",
        text    : "<b>Edit</b> the files again",
        run     : Files.editFiles,
    },
    {
        names     : [ "Mod", "Shift", "S" ],
        keys      : [ "s" ],
        withKey   : true,
        withShift : true,
        action    : "swap-files",
        text      : "<b>Swap</b> the files",
        run       : Files.swapFiles,
    },
    {
        names     : [ "Mod", "Shift", "C" ],
        keys      : [ "c" ],
        withKey   : true,
        withShift : true,
        action    : "copy-patch",
        text      : "<b>Copy</b> the changes as a patch",
        run       : Changes.copyPatch,
    },
    {
        names   : [ "Mod", "↓" ],
        keys    : [ "arrowdown" ],
        withKey : true,
        action  : "next-change",
        text    : "Walk to the <b>next change</b>",
        run     : Changes.nextChange,
    },
    {
        names   : [ "Mod", "↑" ],
        keys    : [ "arrowup" ],
        withKey : true,
        action  : "prev-change",
        text    : "Walk to the <b>change before</b>",
        run     : Changes.prevChange,
    },
    {
        names : [ "1" ],
        keys  : [ "1" ],
        text  : "Show the files <b>side by side</b>",
        run   : () => Changes.setLayout("split"),
    },
    {
        names : [ "2" ],
        keys  : [ "2" ],
        text  : "Show the files as <b>one column</b>",
        run   : () => Changes.setLayout("unified"),
    },
    {
        names : [ "3" ],
        keys  : [ "3" ],
        text  : "Show the <b>structure</b> of the JSON",
        run   : () => Changes.setLayout("tree"),
    },
    {
        names  : [ "W" ],
        keys   : [ "w" ],
        action : "toggle-wrap",
        text   : "<b>Wrap</b> the long lines, or let them run",
        run    : () => Settings.toggleSetting("wrapLines"),
    },
    {
        names  : [ "U" ],
        keys   : [ "u" ],
        action : "toggle-fold",
        text   : "<b>Unfold</b> every line that did not change, or fold them again",
        run    : () => Settings.toggleSetting("hideSame"),
    },
    {
        names   : [ "Mod", "," ],
        keys    : [ "," ],
        withKey : true,
        action  : "open-settings",
        text    : "Open the <b>Settings</b>",
        run     : () => App.settings.open(),
    },
    {
        names    : [ "?" ],
        keys     : [ "?" ],
        anyShift : true,
        text     : "Show this list of <b>shortcuts</b>",
        run      : () => App.settings.open("keys"),
    },
];



/**
 * Does what the given key asks of the app, and says whether it asked for
 * anything: a key that is not bound is left to the browser
 * @param {KeyboardEvent} event
 * @returns {Boolean}
 */
export function handleKey(event) {
    if (event.altKey) {
        return false;
    }

    // A key held is part of what is pressed, so one that asks for it is not
    // the same shortcut as the letter on its own
    const withKey  = event.ctrlKey || event.metaKey;
    const key      = event.key.toLowerCase();
    const shortcut = SHORTCUTS.find((one) => one.keys.includes(key) &&
        Boolean(one.withKey) === withKey &&
        (one.anyShift || Boolean(one.withShift) === event.shiftKey));
    if (!shortcut) {
        return false;
    }

    // A Dialog is a question, and the app is not listening until it is
    // answered or taken away. What is typed belongs to the field it is typed
    // in, unless a key is held, which is what tells a command from a letter
    if (!shortcut.always) {
        if (getOpenDialog()) {
            return false;
        }
        if (!withKey && isTyping()) {
            return false;
        }
    }
    return shortcut.run(event) !== false;
}

/**
 * Says which key does the same as a button, on the button itself
 * @returns {Void}
 */
export function showKeys() {
    for (const shortcut of SHORTCUTS) {
        if (!shortcut.action) {
            continue;
        }
        const name = getNames(shortcut).join(" ");
        for (const element of document.querySelectorAll(`[data-action="${shortcut.action}"][data-tip]`)) {
            if (element instanceof HTMLElement) {
                element.dataset.keys = name;
            }
        }
    }
}

/**
 * Returns every shortcut there is, to be listed
 * @returns {Object[]}
 */
export function getShortcuts() {
    return SHORTCUTS.map((shortcut) => ({ names : getNames(shortcut), text : shortcut.text }));
}

/**
 * Returns the keys of the given Shortcut as this machine calls them
 * @param {Object} shortcut
 * @returns {String[]}
 */
function getNames(shortcut) {
    return shortcut.names.map((name) => {
        switch (name) {
        case "Mod":
            return MOD_KEY;
        case "Shift":
            return SHIFT_KEY;
        default:
            return name;
        }
    });
}

/**
 * Closes whatever is open, from the top: a Dialog that can be closed, and
 * then the field that is being typed in
 * @returns {Boolean}
 */
function closeSomething() {
    // A Dialog is closed the way its own button closes it
    const dialog = getOpenDialog();
    if (dialog) {
        const close = dialog.querySelector("[data-action^='close-']");
        if (close instanceof HTMLElement) {
            close.click();
            return true;
        }
        return false;
    }

    if (isTyping() && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
        return true;
    }
    return false;
}

/**
 * Returns the Dialog that is open, if any is
 * @returns {?HTMLElement}
 */
function getOpenDialog() {
    for (const element of document.querySelectorAll("[data-dialog]")) {
        // One on its way out is already answered, and a second Escape belongs
        // to whatever is behind it
        if (element instanceof HTMLElement && !element.classList.contains("closing") &&
            getComputedStyle(element).display !== "none"
        ) {
            return element;
        }
    }
    return null;
}

/**
 * Returns true if what is typed belongs to a field rather than to the app
 * @returns {Boolean}
 */
function isTyping() {
    const element = document.activeElement;
    return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
}
