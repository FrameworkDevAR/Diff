import diffSequence from "./Sequence.js";



// A line is read as words, the spaces between them and the marks around
// them, so a change to one word does not mark the ones beside it
const TOKENS = /[\p{L}\p{N}_]+|\s+|[^\p{L}\p{N}_\s]/gu;

// Past this much of both lines changed, the line was written again rather
// than edited, and marking most of it says less than marking none
const REWRITTEN = 0.7;



/**
 * Marks what changed inside a pair of lines, one taken out and one put in at
 * the same place, or says there is nothing worth marking
 * @param {String} oldText
 * @param {String} newText
 * @returns {?{oldParts: Object[], newParts: Object[]}}
 */
export function markWords(oldText, newText) {
    const oldTokens = oldText.match(TOKENS) || [];
    const newTokens = newText.match(TOKENS) || [];
    const ids       = new Map();
    const toID      = (token) => {
        if (!ids.has(token)) {
            ids.set(token, ids.size);
        }
        return ids.get(token);
    };

    const steps    = diffSequence(oldTokens.map(toID), newTokens.map(toID));
    const oldParts = [];
    const newParts = [];

    for (const step of steps) {
        if (step.type !== "add") {
            addPart(oldParts, oldTokens[step.oldIndex], step.type === "remove");
        }
        if (step.type !== "remove") {
            addPart(newParts, newTokens[step.newIndex], step.type === "add");
        }
    }

    if (markedRatio(oldParts) > REWRITTEN && markedRatio(newParts) > REWRITTEN) {
        return null;
    }
    return { oldParts, newParts };
}

/**
 * Adds the text to the parts, onto the last one when it is marked the same
 * @param {Object[]} parts
 * @param {String}   text
 * @param {Boolean}  isMarked
 * @returns {Void}
 */
function addPart(parts, text, isMarked) {
    const last = parts[parts.length - 1];
    if (last && last.isMarked === isMarked) {
        last.text += text;
    } else {
        parts.push({ text, isMarked });
    }
}

/**
 * Returns how much of the line is marked, in characters
 * @param {Object[]} parts
 * @returns {Number}
 */
function markedRatio(parts) {
    let total  = 0;
    let marked = 0;
    for (const part of parts) {
        total += part.text.length;
        if (part.isMarked) {
            marked += part.text.length;
        }
    }
    return total ? marked / total : 0;
}
