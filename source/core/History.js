import Storage from "./Storage.js";



// How many of the diffs that were not saved are kept, newest first
const MAX_RECENT = 20;



/**
 * The History, which keeps the diffs that were compared: the recent ones for
 * a while, and the saved ones, which have a name, for good
 */
export default class History {

    /** @type {Storage} */
    #storage;

    /** @type {Number[]} */
    #ids = [];


    /**
     * History constructor
     * @param {Storage} storage
     */
    constructor(storage) {
        this.#storage = storage;
        this.#ids     = storage.getHistory();
    }

    /**
     * Returns true when nothing was ever compared
     * @returns {Boolean}
     */
    get isEmpty() {
        return this.#ids.length === 0;
    }

    /**
     * Returns the entry with the given ID, if it is still there
     * @param {Number} id
     * @returns {?Object}
     */
    get(id) {
        return this.#storage.getEntry(id);
    }

    /**
     * Returns every entry, the saved ones apart from the recent, each
     * newest first
     * @returns {{pinned: Object[], recent: Object[]}}
     */
    list() {
        const pinned = [];
        const recent = [];
        for (const id of this.#ids) {
            const entry = this.get(id);
            if (entry) {
                (entry.isPinned ? pinned : recent).push(entry);
            }
        }
        return { pinned, recent };
    }

    /**
     * Returns what the entry is called: the name it was saved with, or the
     * names of its files, and nothing for a pair that was only pasted in,
     * which is told by what it holds
     * @param {Object} entry
     * @returns {String}
     */
    static nameOf(entry) {
        if (entry.name) {
            return entry.name;
        }
        if (entry.oldName || entry.newName) {
            if (entry.oldName === entry.newName) {
                return entry.oldName;
            }
            return `${entry.oldName || "old"} → ${entry.newName || "new"}`;
        }
        return "";
    }



    /**
     * Keeps the given pair as the newest entry, or takes the entry that
     * already holds it as the newest, and returns the entry. The saved ones
     * stay where they are, since they are kept apart from the recent
     * @param {{name: String, text: String}} oldFile
     * @param {{name: String, text: String}} newFile
     * @param {Object}                       compare
     * @returns {Object}
     */
    remember(oldFile, newFile, compare) {
        const found = this.#find(oldFile, newFile);
        if (found) {
            found.time = Date.now();
            if (!found.isPinned) {
                this.#ids = [ found.id, ...this.#ids.filter((id) => id !== found.id) ];
                this.#storage.setHistory(this.#ids);
            }
            this.#storage.setEntry(found);
            return found;
        }

        const entry = {
            id       : this.#storage.nextHistory,
            name     : "",
            oldName  : oldFile.name || "",
            newName  : newFile.name || "",
            oldText  : oldFile.text,
            newText  : newFile.text,
            kind     : compare.kind,
            lines    : compare.newLines.length,
            added    : compare.lines.added,
            removed  : compare.lines.removed,
            changes  : compare.lines.changes,
            time     : Date.now(),
            isPinned : false,
        };
        this.#storage.setNumber("nextHistory", entry.id + 1);

        // The oldest of the recent make room, and when the browser has no
        // room for it even then, the entry is not kept and nothing is lost
        this.#ids.unshift(entry.id);
        this.#trimRecent(MAX_RECENT);
        while (!this.#storage.setEntry(entry)) {
            const recent = this.#ids.filter((id) => id !== entry.id && !this.#isPinned(id));
            if (!recent.length) {
                this.#ids = this.#ids.filter((id) => id !== entry.id);
                entry.id  = 0;
                break;
            }
            this.#trimRecent(recent.length - 1);
        }
        this.#storage.setHistory(this.#ids);
        return entry;
    }

    /**
     * Saves the entry for good, under the given name
     * @param {Number} id
     * @param {String} name
     * @returns {Void}
     */
    pin(id, name) {
        const entry = this.get(id);
        if (entry) {
            entry.name     = name;
            entry.isPinned = true;
            this.#storage.setEntry(entry);
        }
    }

    /**
     * Lets the entry go back among the recent
     * @param {Number} id
     * @returns {Void}
     */
    unpin(id) {
        const entry = this.get(id);
        if (entry) {
            entry.name     = "";
            entry.isPinned = false;
            this.#storage.setEntry(entry);
        }
    }

    /**
     * Removes the entry
     * @param {Number} id
     * @returns {Void}
     */
    remove(id) {
        this.#ids = this.#ids.filter((one) => one !== id);
        this.#storage.removeEntry(id);
        this.#storage.setHistory(this.#ids);
    }

    /**
     * Removes every entry that was not saved
     * @returns {Void}
     */
    clearRecent() {
        this.#trimRecent(0);
        this.#storage.setHistory(this.#ids);
    }



    /**
     * Returns the entry that holds the given pair, if one does
     * @param {{name: String, text: String}} oldFile
     * @param {{name: String, text: String}} newFile
     * @returns {?Object}
     */
    #find(oldFile, newFile) {
        for (const id of this.#ids) {
            const entry = this.get(id);
            if (entry && entry.oldText === oldFile.text && entry.newText === newFile.text) {
                return entry;
            }
        }
        return null;
    }

    /**
     * Returns true if the entry with the given ID is saved
     * @param {Number} id
     * @returns {Boolean}
     */
    #isPinned(id) {
        const entry = this.get(id);
        return Boolean(entry && entry.isPinned);
    }

    /**
     * Removes the oldest of the recent entries past the given amount
     * @param {Number} amount
     * @returns {Void}
     */
    #trimRecent(amount) {
        let count = 0;
        this.#ids = this.#ids.filter((id) => {
            if (this.#isPinned(id)) {
                return true;
            }
            count += 1;
            if (count > amount) {
                this.#storage.removeEntry(id);
                return false;
            }
            return true;
        });
    }
}
