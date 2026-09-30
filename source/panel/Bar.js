import Utils from "../core/Utils.js";



/**
 * The Bar at the bottom, which holds the buttons of the files while they are
 * edited and the layouts of the result once they are compared
 */
export default class Bar {

    /** @type {HTMLElement} */
    #tabs;
    /** @type {HTMLElement} */
    #tree;


    /**
     * Bar constructor
     */
    constructor() {
        this.#tabs = document.querySelector(".bar .tabs");
        this.#tree = this.#tabs.querySelector("[data-layout='tree']");
    }

    /**
     * Shows the Structure layout, which only two JSON files have
     * @param {Boolean} isJson
     * @returns {Void}
     */
    setJson(isJson) {
        this.#tree.style.display = isJson ? "" : "none";
    }

    /**
     * Marks the given layout as the one shown
     * @param {String}   layout
     * @param {Boolean=} withMove
     * @returns {Void}
     */
    setLayout(layout, withMove = true) {
        for (const element of this.#tabs.querySelectorAll("[data-layout]")) {
            element.classList.toggle("selected", element.dataset.layout === layout);
        }
        Utils.moveMark(this.#tabs, withMove);
    }
}
