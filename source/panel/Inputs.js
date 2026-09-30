// The two sides a file can be on
export const SIDES = [ "old", "new" ];



/**
 * The Inputs, which are the two cards the files are put in
 */
export default class Inputs {

    /** @type {Object.<String, {card: HTMLElement, area: HTMLTextAreaElement, name: HTMLElement}>} */
    #sides = {};


    /**
     * Inputs constructor
     */
    constructor() {
        for (const side of SIDES) {
            const card = document.querySelector(`.input[data-side="${side}"]`);
            this.#sides[side] = {
                card,
                area : card.querySelector("textarea"),
                name : card.querySelector(".input-name"),
            };
        }
    }

    /**
     * Returns the side of the card the given element is in, if any
     * @param {?EventTarget} target
     * @returns {String}
     */
    getSide(target) {
        const card = target instanceof HTMLElement ? target.closest(".input") : null;
        return card instanceof HTMLElement ? card.dataset.side : "";
    }

    /**
     * Returns the side with nothing in it yet, or the new one
     * @returns {String}
     */
    get emptySide() {
        return SIDES.find((side) => !this.hasText(side)) || "new";
    }

    /**
     * Returns true if the given side has any text
     * @param {String} side
     * @returns {Boolean}
     */
    hasText(side) {
        return this.#sides[side].area.value.length > 0;
    }

    /**
     * Returns the file of the given side
     * @param {String} side
     * @returns {{name: String, text: String}}
     */
    getFile(side) {
        return {
            name : this.#sides[side].card.dataset.name || "",
            text : this.#sides[side].area.value,
        };
    }

    /**
     * Puts the given file in the given side
     * @param {String}                       side
     * @param {{name: String, text: String}} file
     * @returns {Void}
     */
    setFile(side, file) {
        this.#sides[side].area.value = file.text || "";
        this.setName(side, file.name || "");
    }

    /**
     * Names the file of the given side, which is the name it was picked with
     * @param {String} side
     * @param {String} name
     * @returns {Void}
     */
    setName(side, name) {
        const { card, name : element } = this.#sides[side];
        card.dataset.name   = name;
        element.textContent = name;
        this.update(side);
    }

    /**
     * Says what the side holds, on the card: whether there is anything to
     * clear, and whether what there is reads as JSON
     * @param {String} side
     * @returns {Void}
     */
    update(side) {
        const { card, area } = this.#sides[side];
        card.classList.toggle("has-text", area.value.length > 0 || Boolean(card.dataset.name));
        card.classList.toggle("is-json", isJson(area.value));
    }

    /**
     * Empties the given side
     * @param {String} side
     * @returns {Void}
     */
    clear(side) {
        this.setFile(side, { name : "", text : "" });
        this.focus(side);
    }

    /**
     * Puts the caret in the given side
     * @param {String} side
     * @returns {Void}
     */
    focus(side) {
        this.#sides[side].area.focus();
    }

    /**
     * Says whether a file is being dragged over the given side
     * @param {String}  side
     * @param {Boolean} isDragging
     * @returns {Void}
     */
    setDragging(side, isDragging) {
        for (const one of SIDES) {
            this.#sides[one].card.classList.toggle("dragging", isDragging && one === side);
        }
    }
}



/**
 * Returns true if the text reads as a JSON object or list
 * @param {String} text
 * @returns {Boolean}
 */
function isJson(text) {
    if (!/^\s*[[{]/.test(text)) {
        return false;
    }
    try {
        JSON.parse(text);
        return true;
    } catch {
        return false;
    }
}
