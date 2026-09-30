import * as Keys from "../actions/Keys.js";
import Utils     from "../core/Utils.js";



// What the one button of the state says in each, and what it does
const STATES = {
    edit : {
        action    : "compare-files",
        text      : "Compare",
        tip       : "Compare the files",
        className : "btn btn-small btn-fill bar-state",
    },
    result : {
        action    : "edit-files",
        text      : "Edit",
        tip       : "Edit the files",
        className : "bar-toggle bar-state",
    },
};

// What each toggle says on and off, which is what a click would do
const TOGGLES = {
    wrap : {
        on  : { text : "Unwrap", tip : "Let the long lines run" },
        off : { text : "Wrap", tip : "Wrap the long lines" },
    },
    unfold : {
        on  : { text : "Fold", tip : "Fold the lines that did not change" },
        off : { text : "Unfold", tip : "Show every line that did not change" },
    },
};



/**
 * The Bar at the bottom, which holds the buttons of the files while they are
 * edited and the layouts of the result once they are compared
 */
export default class Bar {

    /** @type {HTMLElement} */
    #element;
    /** @type {HTMLElement} */
    #tabs;
    /** @type {HTMLElement} */
    #tree;
    /** @type {HTMLElement} */
    #wrap;
    /** @type {HTMLElement} */
    #unfold;
    /** @type {HTMLElement} */
    #state;


    /**
     * Bar constructor
     */
    constructor() {
        this.#element = document.querySelector(".bar");
        this.#tabs    = this.#element.querySelector(".tabs");
        this.#tree    = this.#tabs.querySelector("[data-layout='tree']");
        this.#wrap    = this.#element.querySelector(".bar-wrap");
        this.#unfold  = this.#element.querySelector(".bar-unfold");
        this.#state   = this.#element.querySelector(".bar-state");
    }

    /**
     * Turns the one button of the state into the one the state asks for:
     * Compare, filled, while the files are edited, and Edit, plain like the
     * toggles beside it, while they are compared
     * @param {String} state
     * @returns {Void}
     */
    setState(state) {
        const data = STATES[state];
        this.#state.className      = data.className;
        this.#state.dataset.action = data.action;
        this.#state.dataset.keys   = Keys.keysOf(data.action);
        setButton(this.#state, data.text, data.tip);
    }

    /**
     * Names the toggles by what a click would do, and lights the ones that
     * are on
     * @param {Object} values
     * @returns {Void}
     */
    setToggles(values) {
        setToggle(this.#wrap, TOGGLES.wrap, Boolean(values.wrapLines));
        setToggle(this.#unfold, TOGGLES.unfold, !values.hideSame);
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



/**
 * Sets a toggle the way it is: lit when on, and named by the other way
 * @param {HTMLElement} element
 * @param {Object}      texts
 * @param {Boolean}     isOn
 * @returns {Void}
 */
function setToggle(element, texts, isOn) {
    const data = isOn ? texts.on : texts.off;
    element.classList.toggle("selected", isOn);
    setButton(element, data.text, data.tip);
}

/**
 * Names a button, and its tip
 * @param {HTMLElement} element
 * @param {String}      text
 * @param {String}      tip
 * @returns {Void}
 */
function setButton(element, text, tip) {
    element.textContent = text;
    element.dataset.tip = tip;
    element.setAttribute("aria-label", tip);
}
