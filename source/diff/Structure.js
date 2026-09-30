import { kindOf } from "./Json.js";



// How far each level of the JSON is set in from the one above
const INDENT = "    ";



/**
 * Writes both JSON values out side by side from the tree of their
 * differences, line by line, so what is the same on both sides sits on the
 * same row and what is only on one side leaves the other side empty. The
 * keys go in the one order on both sides, whatever order each was written
 * in, since the order is no difference
 * @param {Object} tree
 * @returns {{rows: Object[], oldLines: String[], newLines: String[]}}
 */
export function buildStructure(tree) {
    const state = { rows : [], oldLines : [], newLines : [], hunk : 0, checks : { missing : 0, type : 0, value : 0 } };
    walk(tree.root, state, 0, "", false, false);
    return state;
}

/**
 * Writes the node out, with the comma each side needs after it
 * @param {Object}  node
 * @param {Object}  state
 * @param {Number}  depth
 * @param {String}  prefix
 * @param {Boolean} commaLeft
 * @param {Boolean} commaRight
 * @returns {Void}
 */
function walk(node, state, depth, prefix, commaLeft, commaRight) {
    const pad   = INDENT.repeat(depth);
    const left  = commaLeft ? "," : "";
    const right = commaRight ? "," : "";

    switch (node.type) {
    case "added":
        emitSide(state, "right", valueLines(node.newValue, pad, prefix, right), "add", "only in the new file");
        return;
    case "removed":
        emitSide(state, "left", valueLines(node.oldValue, pad, prefix, left), "remove", "only in the old file");
        return;
    case "changed":
        emitChange(state, node, pad, prefix, left, right);
        return;
    default:
    }

    // What stayed the same, or holds a change somewhere inside
    if (!node.children) {
        const text = `${pad}${prefix}${formatValue(node.newValue)}`;
        emitBoth(state, `${text}${left}`, `${text}${right}`);
        return;
    }

    const [ open, close ] = node.kind === "array" ? [ "[", "]" ] : [ "{", "}" ];
    if (!node.children.length) {
        emitBoth(state, `${pad}${prefix}${open}${close}${left}`, `${pad}${prefix}${open}${close}${right}`);
        return;
    }

    // The last item of each side is the last one that side has, and the
    // comma goes after every item but that one
    const lastLeft  = findLast(node.children, (child) => child.type !== "added");
    const lastRight = findLast(node.children, (child) => child.type !== "removed");

    emitBoth(state, `${pad}${prefix}${open}`, `${pad}${prefix}${open}`);
    for (const [ index, child ] of node.children.entries()) {
        const childPrefix = node.kind === "array" ? "" : `${JSON.stringify(child.key)}: `;
        walk(child, state, depth + 1, childPrefix, index !== lastLeft, index !== lastRight);
    }
    emitBoth(state, `${pad}${close}${left}`, `${pad}${close}${right}`);
}

/**
 * Writes a value that changed on both sides, the old one at the left and
 * the new one at the right, with the value itself marked when each fits in
 * a line
 * @param {Object} state
 * @param {Object} node
 * @param {String} pad
 * @param {String} prefix
 * @param {String} left
 * @param {String} right
 * @returns {Void}
 */
function emitChange(state, node, pad, prefix, left, right) {
    const oldLines = valueLines(node.oldValue, pad, prefix, left);
    const newLines = valueLines(node.newValue, pad, prefix, right);
    const oldType  = typeName(node.oldValue);
    const newType  = typeName(node.newValue);
    const check    = oldType === newType ? "value" : "type";
    const note     = check === "value" ? "value changed" : `${oldType} \u2192 ${newType}`;
    const hunk     = state.hunk++;
    const total    = Math.max(oldLines.length, newLines.length);

    state.checks[check] += 1;
    for (let i = 0; i < total; i += 1) {
        const row = { kind : "change", hunk, check, left : { type : "empty" }, right : { type : "empty" } };
        if (i < oldLines.length) {
            row.left = { type : "changed", number : state.oldLines.push(oldLines[i]), text : oldLines[i] };
        }
        if (i < newLines.length) {
            row.right = { type : "changed", number : state.newLines.push(newLines[i]), text : newLines[i], note : i === 0 ? note : "" };
        }
        if (total === 1) {
            row.left.parts  = valueParts(pad + prefix, formatValue(node.oldValue), left);
            row.right.parts = valueParts(pad + prefix, formatValue(node.newValue), right);
        }
        state.rows.push(row);
    }
}

/**
 * Writes lines that are only on one side, leaving the other empty, with
 * the note on the first of them
 * @param {Object}   state
 * @param {String}   side
 * @param {String[]} lines
 * @param {String}   type
 * @param {String}   note
 * @returns {Void}
 */
function emitSide(state, side, lines, type, note) {
    const hunk = state.hunk++;
    state.checks.missing += 1;
    for (const [ index, text ] of lines.entries()) {
        const number = (side === "left" ? state.oldLines : state.newLines).push(text);
        const cell   = { type, number, text, note : index === 0 ? note : "" };
        state.rows.push({
            kind  : "change",
            hunk,
            check : "missing",
            left  : side === "left" ? cell : { type : "empty" },
            right : side === "right" ? cell : { type : "empty" },
        });
    }
}

/**
 * Writes a line that is on both sides
 * @param {Object} state
 * @param {String} leftText
 * @param {String} rightText
 * @returns {Void}
 */
function emitBoth(state, leftText, rightText) {
    state.rows.push({
        kind  : "same",
        left  : { type : "same", number : state.oldLines.push(leftText), text : leftText },
        right : { type : "same", number : state.newLines.push(rightText), text : rightText },
    });
}



/**
 * Returns the lines of a value written out, set in by the given pad, with
 * the prefix on the first line and the comma after the last
 * @param {*}      value
 * @param {String} pad
 * @param {String} prefix
 * @param {String} comma
 * @returns {String[]}
 */
function valueLines(value, pad, prefix, comma) {
    const lines = JSON.stringify(value, null, INDENT).split("\n").map((line) => `${pad}${line}`);
    lines[0] = `${pad}${prefix}${lines[0].slice(pad.length)}`;
    lines[lines.length - 1] += comma;
    return lines;
}

/**
 * Returns the parts of a line of one value, with the value marked and the
 * key and the comma around it not
 * @param {String} before
 * @param {String} value
 * @param {String} after
 * @returns {Object[]}
 */
function valueParts(before, value, after) {
    const parts = [];
    if (before) {
        parts.push({ text : before, isMarked : false });
    }
    parts.push({ text : value, isMarked : true });
    if (after) {
        parts.push({ text : after, isMarked : false });
    }
    return parts;
}

/**
 * Returns a plain value as it is written in JSON
 * @param {*} value
 * @returns {String}
 */
function formatValue(value) {
    return JSON.stringify(value);
}

/**
 * Returns what kind of a thing the value is, in a word
 * @param {*} value
 * @returns {String}
 */
function typeName(value) {
    switch (kindOf(value)) {
    case "array":
        return "list";
    case "object":
        return "object";
    default:
        return value === null ? "null" : typeof value;
    }
}

/**
 * Returns the index of the last item that answers the test, or -1
 * @param {Array}    items
 * @param {Function} test
 * @returns {Number}
 */
function findLast(items, test) {
    for (let i = items.length - 1; i >= 0; i -= 1) {
        if (test(items[i])) {
            return i;
        }
    }
    return -1;
}
