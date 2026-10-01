import * as App     from "../App.js";
import * as History from "./History.js";
import { SIDES }    from "../panel/Inputs.js";
import Compare     from "../core/Compare.js";
import Link        from "../core/Link.js";
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

// True while the address is being followed rather than led
let isMoving = false;



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
 * Shows what the address asks for: the diff of the History it names, the
 * files a link carries, or else what was left. It is what runs when the
 * page opens and when going back and forward, where the address is already
 * the one to be at and so is only ever corrected, never added to
 * @param {Boolean=} isStart
 * @returns {Promise}
 */
export async function openAddress(isStart = false) {
    isMoving = true;
    try {
        if (openEntry() || await openLink()) {
            return;
        }
        if (isStart) {
            start();
        } else {
            editFiles();
        }
    } finally {
        isMoving = false;
    }
}

/**
 * Puts the files of the diff the address names in and compares them, and
 * says whether it names one that is still in the History
 * @returns {Boolean}
 */
function openEntry() {
    const match = window.location.hash.match(/^#h=(\d+)$/);
    if (!match) {
        return false;
    }

    const entry = App.history.get(Number(match[1]));
    if (!entry) {
        App.toast.show("That diff is not in the history anymore");
        setAddress("");
        return false;
    }
    showFiles({ name : entry.oldName, text : entry.oldText }, { name : entry.newName, text : entry.newText });
    return true;
}

/**
 * Puts the files of the link in the address in and compares them, and says
 * whether there were any. The diff is then kept in the History, and its
 * address there takes the place of the link
 * @returns {Promise<Boolean>}
 */
async function openLink() {
    if (window.location.hash.length < 2) {
        return false;
    }

    let link = null;
    try {
        link = await Link.read(window.location.hash);
    } catch (error) {
        App.toast.show(error.message);
    }
    if (!link) {
        setAddress("");
        return false;
    }

    if (link.layout) {
        App.storage.setLayout(link.layout);
    }
    showFiles(link.old, link.new);
    return true;
}

/**
 * Puts the two files in and compares them
 * @param {{name: String, text: String}} oldFile
 * @param {{name: String, text: String}} newFile
 * @returns {Void}
 */
export function showFiles(oldFile, newFile) {
    App.inputs.setFile("old", oldFile);
    App.inputs.setFile("new", newFile);
    for (const side of SIDES) {
        keepFile(side);
    }
    compareFiles();
}

/**
 * Takes the address to what is after its # for the diff being looked at,
 * or to none when the files are being edited. Each one is a step to go
 * back to, unless it is where a step back or forward has just led
 * @param {String} hash
 * @returns {Void}
 */
export function setAddress(hash) {
    if (window.location.hash === hash) {
        return;
    }
    const address = window.location.pathname + window.location.search + hash;
    if (isMoving) {
        window.history.replaceState(null, "", address);
    } else {
        window.history.pushState(null, "", address);
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
    App.bar.setToggles(App.configs.values);
    App.bar.setLayout(layout, false);
    App.result.show(compare, App.configs.values, layout);
    updateStatus();
    History.remember();
}

/**
 * Goes back to the files, to change them
 * @returns {Void}
 */
export function editFiles() {
    setState("edit");
    setAddress("");
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
    App.bar.setState(state);
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

    const parts = [ compare.kind ];

    // The structure says how many differences answer to each check, and
    // each is a switch that hides its differences
    if (App.result.layout === "tree" && compare.tree) {
        const counts = App.result.checkCounts;
        const checks = App.result.checks;
        const names  = { missing : "missing", type : "types", value : "values" };
        const badges = [];
        for (const [ name, count ] of Object.entries(counts)) {
            if (count) {
                const label = count === 1 ? name : names[name];
                badges.push(`<b class="badge-check${checks[name] ? "" : " is-off"}" data-action="toggle-check" data-check="${name}">${count} ${label}</b>`);
            }
        }
        parts.push(badges.length ? badges.join("") : "no changes");
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
