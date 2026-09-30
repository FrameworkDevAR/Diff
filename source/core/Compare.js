import { splitLines, compareLines, buildSplit, buildUnified, foldRows, toPatch } from "../diff/Lines.js";
import { compareJson, sortKeys } from "../diff/Json.js";
import { buildStructure } from "../diff/Structure.js";
import { detectLanguage, languageName, tokenize } from "../diff/Syntax.js";



/**
 * The Compare, which holds the two files and what was found between them
 */
export default class Compare {

    /** @type {{name: String, text: String}} */
    oldFile;
    /** @type {{name: String, text: String}} */
    newFile;

    /** @type {?{value: *}} */
    #oldJson = null;
    /** @type {?{value: *}} */
    #newJson = null;

    /** @type {String} */
    language = "";

    /** @type {String[]} */
    oldLines = [];
    /** @type {String[]} */
    newLines = [];

    /** @type {Object[][]} */
    oldTokens = [];
    /** @type {Object[][]} */
    newTokens = [];

    /** @type {?Object} */
    lines = null;
    /** @type {?Object} */
    tree = null;


    /**
     * Compare constructor
     * @param {{name: String, text: String}} oldFile
     * @param {{name: String, text: String}} newFile
     */
    constructor(oldFile, newFile) {
        this.oldFile  = oldFile;
        this.newFile  = newFile;
        this.#oldJson = parseJson(oldFile.text);
        this.#newJson = parseJson(newFile.text);

        // The language is read off the new file, which is the one being
        // written, and off the old one when the new one says nothing
        this.language = detectLanguage(newFile.name, newFile.text, this.isJson) ||
            detectLanguage(oldFile.name, oldFile.text, this.isJson);
    }

    /**
     * Returns what the files are called, by what they are written in
     * @returns {String}
     */
    get kind() {
        return languageName(this.language) || "Text";
    }

    /**
     * Returns true when both files are JSON, which is when they have a
     * structure to compare besides their text
     * @returns {Boolean}
     */
    get isJson() {
        return Boolean(this.#oldJson && this.#newJson);
    }

    /**
     * Returns true when nothing changed between the lines of the files, as
     * they are compared
     * @returns {Boolean}
     */
    get isSame() {
        return Boolean(this.lines) && this.lines.changes === 0;
    }



    /**
     * Compares the files the way the options ask for
     * @param {Object} options
     * @returns {Void}
     */
    run(options) {
        this.oldLines = splitLines(this.#textOf(this.#oldJson, this.oldFile.text, options));
        this.newLines = splitLines(this.#textOf(this.#newJson, this.newFile.text, options));
        this.lines    = compareLines(this.oldLines, this.newLines, options);
        this.tree     = this.isJson ? compareJson(this.#oldJson.value, this.#newJson.value) : null;

        const language = options.highlightCode ? this.language : "";
        this.oldTokens = tokenize(this.oldLines, language);
        this.newTokens = tokenize(this.newLines, language);
    }

    /**
     * Returns the text of a file as its lines are compared: a JSON file is
     * written out again when the options ask for it, so its lines are the
     * values it holds rather than however it was saved
     * @param {?{value: *}} json
     * @param {String}      text
     * @param {Object}      options
     * @returns {String}
     */
    #textOf(json, text, options) {
        if (!this.isJson || !options.prettyJson) {
            return text;
        }
        const value = options.sortKeys ? sortKeys(json.value) : json.value;
        return JSON.stringify(value, null, 4);
    }

    /**
     * Returns the rows of the side by side view
     * @param {Object} options
     * @returns {Object[]}
     */
    splitRows(options) {
        return buildSplit(this.lines, this.oldLines, this.newLines, options);
    }

    /**
     * Returns the rows of the unified view
     * @param {Object} options
     * @returns {Object[]}
     */
    unifiedRows(options) {
        return buildUnified(this.lines, this.oldLines, this.newLines, options);
    }

    /**
     * Returns the rows of the structure view, which are both JSON values
     * written out side by side from what they hold, the colors of each
     * side's lines, and how many differences answer to each check. A
     * difference of a check that is off is drawn as if it were none
     * @param {Object} options
     * @param {Object} checks
     * @returns {{rows: Object[], oldTokens: Object[][], newTokens: Object[][], checks: Object}}
     */
    structure(options, checks) {
        const data     = buildStructure(this.tree);
        const language = options.highlightCode ? "json" : "";
        const rows     = data.rows.map((row) => (row.check && !checks[row.check] ? plainRow(row) : row));
        return {
            rows      : foldRows(rows, options),
            oldTokens : tokenize(data.oldLines, language),
            newTokens : tokenize(data.newLines, language),
            checks    : data.checks,
        };
    }

    /**
     * Returns the changes as a patch
     * @returns {String}
     */
    patch() {
        return toPatch(this.lines, this.oldLines, this.newLines, this.oldFile.name, this.newFile.name);
    }
}



/**
 * Returns the row as one that did not change, keeping only the lines
 * @param {Object} row
 * @returns {Object}
 */
function plainRow(row) {
    const plain = (side) => (side.type === "empty" ? side : { type : "same", number : side.number, text : side.text });
    return { kind : "same", left : plain(row.left), right : plain(row.right) };
}

/**
 * Reads the text as JSON, when it is some. A lone number or string is JSON
 * too, but has no structure to compare, so it is left as text
 * @param {String} text
 * @returns {?{value: *}}
 */
function parseJson(text) {
    if (!text || !/^\s*[[{]/.test(text)) {
        return null;
    }
    try {
        return { value : JSON.parse(text) };
    } catch {
        return null;
    }
}
