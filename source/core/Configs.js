import Storage from "./Storage.js";



// What the app does when nothing has been asked of it
const DEFAULTS = {
    ignoreSpace    : false,
    ignoreCase     : false,
    markWords      : true,
    highlightCode  : true,
    hideSame       : true,
    wrapLines      : false,
    prettyJson     : true,
    sortKeys       : false,
    showSameValues : true,
};



/**
 * The Configs
 */
export default class Configs {

    /** @type {Storage} */
    #storage;

    /** @type {HTMLElement} */
    #body;


    /**
     * Configs constructor
     * @param {Storage} storage
     */
    constructor(storage) {
        this.#storage = storage;
        this.#body    = document.querySelector("body");
        this.values   = { ...DEFAULTS, ...(storage.getSettings() || {}) };
    }

    /**
     * Returns the value of the given Config
     * @param {String} name
     * @returns {*}
     */
    get(name) {
        return this.values[name];
    }

    /**
     * Takes the given Configs, keeping the rest as they are
     * @param {Object} values
     * @returns {Void}
     */
    set(values) {
        this.values = { ...this.values, ...values };
        this.#storage.setSettings(this.values);
        this.apply();
    }

    /**
     * Draws the result the way the Configs ask for
     * @returns {Void}
     */
    apply() {
        this.#body.classList.toggle("wrap-lines", this.values.wrapLines);
    }
}
