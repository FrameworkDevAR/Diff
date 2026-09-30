/**
 * The Storage, which keeps the two files and how they were being looked at
 * for the next visit
 */
export default class Storage {

    /**
     * Returns a stored String
     * @param {...String} keys
     * @returns {String}
     */
    getString(...keys) {
        return localStorage.getItem(keys.join("-")) || "";
    }

    /**
     * Saves a String, and says whether it fit. A file too big for the
     * browser to keep is not kept, and is no less compared for it
     * @param {...*} items
     * @returns {Boolean}
     */
    setString(...items) {
        const value = items.pop();
        try {
            localStorage.setItem(items.join("-"), value);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Returns a stored Number
     * @param {...*} items
     * @returns {Number}
     */
    getNumber(...items) {
        const defValue = items.pop();
        return Number(localStorage.getItem(items.join("-"))) || defValue;
    }

    /**
     * Saves a Number
     * @param {...*} items
     * @returns {Void}
     */
    setNumber(...items) {
        const value = items.pop();
        this.setString(...items, String(value));
    }

    /**
     * Returns a stored Object
     * @param {...String} keys
     * @returns {?Object}
     */
    getData(...keys) {
        const data = localStorage.getItem(keys.join("-"));
        return data ? JSON.parse(data) : null;
    }

    /**
     * Saves an Object
     * @param {...*} items
     * @returns {Void}
     */
    setData(...items) {
        const value = items.pop();
        this.setString(...items, JSON.stringify(value));
    }



    /**
     * Returns the file of the given side, as it was left
     * @param {String} side
     * @returns {{name: String, text: String}}
     */
    getFile(side) {
        return {
            name : this.getString(side, "name"),
            text : this.getString(side, "text"),
        };
    }

    /**
     * Keeps the file of the given side
     * @param {String}                       side
     * @param {{name: String, text: String}} file
     * @returns {Boolean}
     */
    setFile(side, file) {
        this.setString(side, "name", file.name || "");
        const isKept = this.setString(side, "text", file.text || "");
        if (!isKept) {
            localStorage.removeItem(`${side}-text`);
        }
        return isKept;
    }



    /**
     * Returns whether the files were being edited or compared
     * @returns {String}
     */
    getState() {
        return this.getString("state") || "edit";
    }

    /**
     * Keeps whether the files are being edited or compared
     * @param {String} state
     * @returns {Void}
     */
    setState(state) {
        this.setString("state", state);
    }

    /**
     * Returns the layout the result was last shown in
     * @returns {String}
     */
    getLayout() {
        return this.getString("layout") || "split";
    }

    /**
     * Keeps the layout the result is shown in
     * @param {String} layout
     * @returns {Void}
     */
    setLayout(layout) {
        this.setString("layout", layout);
    }



    /**
     * Returns the IDs of the entries of the History, newest first
     * @returns {Number[]}
     */
    getHistory() {
        return this.getData("history") || [];
    }

    /**
     * Keeps the IDs of the entries of the History
     * @param {Number[]} ids
     * @returns {Void}
     */
    setHistory(ids) {
        this.setData("history", ids);
    }

    /**
     * Returns the ID the next entry of the History takes
     * @returns {Number}
     */
    get nextHistory() {
        return this.getNumber("nextHistory", 1);
    }

    /**
     * Returns an entry of the History
     * @param {Number} id
     * @returns {?Object}
     */
    getEntry(id) {
        return this.getData("entry", String(id));
    }

    /**
     * Keeps an entry of the History, and says whether it fit
     * @param {Object} entry
     * @returns {Boolean}
     */
    setEntry(entry) {
        return this.setString("entry", String(entry.id), JSON.stringify(entry));
    }

    /**
     * Removes an entry of the History
     * @param {Number} id
     * @returns {Void}
     */
    removeEntry(id) {
        localStorage.removeItem(`entry-${id}`);
    }



    /**
     * Returns the Settings, if any were ever saved
     * @returns {?Object}
     */
    getSettings() {
        return this.getData("settings");
    }

    /**
     * Saves the Settings
     * @param {Object} settings
     * @returns {Void}
     */
    setSettings(settings) {
        this.setData("settings", settings);
    }

    /**
     * Returns the Mode
     * @returns {String}
     */
    getMode() {
        return this.getString("mode") || "light";
    }

    /**
     * Sets the Mode, which is the light, the dark or the one of the system
     * @param {String} mode
     * @returns {Void}
     */
    setMode(mode) {
        this.setString("mode", mode);
    }
}
