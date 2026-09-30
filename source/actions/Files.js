import * as App    from "../App.js";
import { SIDES }   from "../panel/Inputs.js";
import Compare     from "../core/Compare.js";
import Utils       from "../core/Utils.js";



// Two files with a bit of everything in them, to see the app at work
const EXAMPLE = {
    old : {
        name : "schema.json",
        text : JSON.stringify({
            version : 1,
            tables  : {
                users : {
                    fields : [ "id", "name", "email", "createdAt" ],
                    key    : "id",
                    rows   : 1200,
                },
                orders : {
                    fields : [ "id", "userId", "total", "status" ],
                    key    : "id",
                    rows   : 8400,
                },
                carts : {
                    fields : [ "id", "userId" ],
                    key    : "id",
                },
            },
            options : { audit : true, softDelete : false, timezone : "UTC" },
        }, null, 4),
    },
    new : {
        name : "schema.json",
        text : JSON.stringify({
            version : 2,
            tables  : {
                users : {
                    key    : "id",
                    fields : [ "id", "name", "email", "phone", "createdAt" ],
                    rows   : 1350,
                },
                orders : {
                    fields : [ "id", "userId", "total", "status", "shippedAt" ],
                    key    : "id",
                    rows   : 8400,
                },
                invoices : {
                    fields : [ "id", "orderId", "amount" ],
                    key    : "id",
                },
            },
            options : { audit : true, softDelete : true, timezone : "America/Argentina/Buenos_Aires", locale : "es" },
        }, null, 4),
    },
};

// The timers that hold each file back from being kept on every keystroke
const timers = { old : 0, new : 0 };



/**
 * Puts the files back the way they were left, compared or not
 * @returns {Void}
 */
export function start() {
    for (const side of SIDES) {
        App.inputs.setFile(side, App.storage.getFile(side));
    }

    const hasText = SIDES.some((side) => App.inputs.hasText(side));
    if (App.storage.getState() === "result" && hasText) {
        compareFiles();
    } else {
        editFiles();
    }
}

/**
 * Compares the two files as they are, and shows what was found
 * @returns {Void}
 */
export function compareFiles() {
    const oldFile = App.inputs.getFile("old");
    const newFile = App.inputs.getFile("new");

    if (!oldFile.text && !newFile.text) {
        App.toast.show("Paste or drop the two files first");
        App.inputs.focus("old");
        return;
    }

    const compare = new Compare(oldFile, newFile);
    compare.run(App.configs.values);
    App.useCompare(compare);

    // A layout the files do not have falls back to the first
    let layout = App.storage.getLayout();
    if (layout === "tree" && !compare.isJson) {
        layout = "split";
    }

    setState("result");
    App.bar.setJson(compare.isJson);
    App.bar.setLayout(layout, false);
    App.result.show(compare, App.configs.values, layout);
    updateStatus();
}

/**
 * Goes back to the files, to change them
 * @returns {Void}
 */
export function editFiles() {
    setState("edit");
    App.header.setStatus("Paste or drop the two files to compare");
    App.inputs.focus(App.inputs.emptySide);
}

/**
 * Says whether the files are being edited or compared, to the page and to
 * the Storage, so the next visit opens where this one was
 * @param {String} state
 * @returns {Void}
 */
function setState(state) {
    document.body.classList.toggle("is-editing", state === "edit");
    document.body.classList.toggle("is-result", state === "result");
    App.storage.setState(state);
}

/**
 * Says what was found, beside the title: the kind of the files and the
 * counts of the layout that is shown
 * @returns {Void}
 */
export function updateStatus() {
    const compare = App.compare;
    if (!compare) {
        return;
    }

    const kind  = compare.isJson ? "JSON" : "Text";
    const parts = [ kind ];

    if (App.result.layout === "tree" && compare.tree) {
        const { added, removed, changed } = compare.tree;
        if (!added && !removed && !changed) {
            parts.push("no changes");
        } else {
            parts.push(`<b class="badge-added">+${added}</b><b class="badge-removed">−${removed}</b><b class="badge-changed">~${changed}</b>`);
        }
    } else {
        const { added, removed, changes } = compare.lines;
        if (!changes) {
            parts.push("no changes");
        } else {
            parts.push(changes === 1 ? "1 change" : `${changes} changes`);
            parts.push(`<b class="badge-added">+${added}</b><b class="badge-removed">−${removed}</b>`);
        }
    }
    App.header.setStatus(parts.join("<i class=\"header-dot\"></i>"));
}



/**
 * Puts each file where the other was, and compares them again when they
 * were being compared
 * @returns {Void}
 */
export function swapFiles() {
    const oldFile = App.inputs.getFile("old");
    const newFile = App.inputs.getFile("new");

    App.inputs.setFile("old", newFile);
    App.inputs.setFile("new", oldFile);
    for (const side of SIDES) {
        keepFile(side);
    }

    if (App.compare) {
        compareFiles();
    }
    App.toast.show("The files are swapped");
}

/**
 * Empties the given side
 * @param {String} side
 * @returns {Void}
 */
export function clearFile(side) {
    App.inputs.clear(side);
    keepFile(side);
}

/**
 * Asks for a file for the given side
 * @param {String} side
 * @returns {Void}
 */
export function uploadFile(side) {
    Utils.selectFile((file) => loadFile(side, file));
}

/**
 * Puts the dropped files in: two go one to each side, in the order they
 * were dropped, and one goes where it was dropped, or where there is room
 * @param {String}   side
 * @param {FileList} files
 * @returns {Promise}
 */
export async function dropFiles(side, files) {
    if (!files.length) {
        return;
    }
    if (files.length >= 2) {
        await loadFile("old", files[0]);
        await loadFile("new", files[1]);
        return;
    }
    await loadFile(side || App.inputs.emptySide, files[0]);
}

/**
 * Reads the file into the given side
 * @param {String} side
 * @param {File}   file
 * @returns {Promise}
 */
export async function loadFile(side, file) {
    if (!file) {
        return;
    }
    const text = await Utils.readFile(file);
    App.inputs.setFile(side, { name : file.name, text });
    keepFile(side);
}

/**
 * Keeps the file of the given side for the next visit, once the typing has
 * paused when it is being typed
 * @param {String}   side
 * @param {Boolean=} isTyping
 * @returns {Void}
 */
export function keepFile(side, isTyping = false) {
    App.inputs.update(side);
    if (timers[side]) {
        window.clearTimeout(timers[side]);
        timers[side] = 0;
    }

    const keep = () => App.storage.setFile(side, App.inputs.getFile(side));
    if (isTyping) {
        timers[side] = window.setTimeout(keep, 400);
    } else {
        keep();
    }
}

/**
 * Puts the example files in and compares them
 * @returns {Void}
 */
export function loadExample() {
    for (const side of SIDES) {
        App.inputs.setFile(side, EXAMPLE[side]);
        keepFile(side);
    }
    compareFiles();
}
