import diffSequence  from "./Sequence.js";
import { markWords } from "./Words.js";



// How many lines that did not change are kept on each side of a change, when
// the rest of them are hidden
const CONTEXT = 3;



/**
 * Splits the text into its lines. A text that ends in a line break has no
 * empty line after it, only the break
 * @param {String} text
 * @returns {String[]}
 */
export function splitLines(text) {
    if (!text) {
        return [];
    }
    return text.replace(/\r?\n$/, "").split(/\r?\n/);
}

/**
 * Compares the lines of both texts and returns the blocks they make: a run of
 * lines that stayed, or a change with the lines it took out and the ones it
 * put in. Two lines read as the same when the options say their difference
 * does not count
 * @param {String[]} oldLines
 * @param {String[]} newLines
 * @param {Object}   options
 * @returns {{blocks: Object[], added: Number, removed: Number, changes: Number}}
 */
export function compareLines(oldLines, newLines, options) {
    const ids  = new Map();
    const toID = (line) => {
        const key = normalize(line, options);
        if (!ids.has(key)) {
            ids.set(key, ids.size);
        }
        return ids.get(key);
    };

    const steps  = diffSequence(oldLines.map(toID), newLines.map(toID));
    const blocks = [];
    let   added   = 0;
    let   removed = 0;

    // The steps are gathered into blocks, so a change is the whole of what
    // was taken out and put in at one place, however the steps interleave
    for (const step of steps) {
        const last = blocks[blocks.length - 1];
        if (step.type === "same") {
            if (last && last.type === "same") {
                last.items.push(step);
            } else {
                blocks.push({ type : "same", items : [ step ] });
            }
            continue;
        }

        if (!last || last.type !== "change") {
            blocks.push({ type : "change", removed : [], added : [], oldAt : step.oldIndex, newAt : step.newIndex });
        }
        const block = blocks[blocks.length - 1];
        if (step.type === "remove") {
            block.removed.push(step.oldIndex);
            removed += 1;
        } else {
            block.added.push(step.newIndex);
            added += 1;
        }
    }

    const changes = blocks.filter((block) => block.type === "change").length;
    return { blocks, added, removed, changes };
}

/**
 * Returns the line as it is compared, with whatever the options say does not
 * count taken out of it
 * @param {String} line
 * @param {Object} options
 * @returns {String}
 */
function normalize(line, options) {
    let result = line;
    if (options.ignoreSpace) {
        result = result.replace(/\s+/g, " ").trim();
    }
    if (options.ignoreCase) {
        result = result.toLowerCase();
    }
    return result;
}



/**
 * Returns the rows of the side by side view: each one has the line of the old
 * text at the left and the line of the new one at the right, or an empty side
 * when one has a line the other lacks
 * @param {Object}   compare
 * @param {String[]} oldLines
 * @param {String[]} newLines
 * @param {Object}   options
 * @returns {Object[]}
 */
export function buildSplit(compare, oldLines, newLines, options) {
    const rows = [];
    let   hunk = 0;

    forEachBlock(compare.blocks, options, (block, index, from, to) => {
        if (block.type === "fold") {
            rows.push({ kind : "fold", block : index, count : block.count });
            return;
        }
        if (block.type === "same") {
            for (const step of block.items.slice(from, to)) {
                rows.push({
                    kind  : "same",
                    left  : { type : "same", number : step.oldIndex + 1, text : oldLines[step.oldIndex] },
                    right : { type : "same", number : step.newIndex + 1, text : newLines[step.newIndex] },
                });
            }
            return;
        }

        // The lines taken out are paired with the ones put in, row by row,
        // and the words that changed between each pair are marked
        const total = Math.max(block.removed.length, block.added.length);
        for (let i = 0; i < total; i += 1) {
            const oldIndex = block.removed[i];
            const newIndex = block.added[i];
            const row      = { kind : "change", hunk, left : { type : "empty" }, right : { type : "empty" } };

            if (oldIndex !== undefined) {
                row.left = { type : "remove", number : oldIndex + 1, text : oldLines[oldIndex] };
            }
            if (newIndex !== undefined) {
                row.right = { type : "add", number : newIndex + 1, text : newLines[newIndex] };
            }
            if (oldIndex !== undefined && newIndex !== undefined && options.markWords) {
                const marks = markWords(oldLines[oldIndex], newLines[newIndex]);
                if (marks) {
                    row.left.parts  = marks.oldParts;
                    row.right.parts = marks.newParts;
                }
            }
            rows.push(row);
        }
        hunk += 1;
    });
    return rows;
}

/**
 * Returns the rows of the unified view: one column of lines, where a change
 * is the lines it took out followed by the ones it put in
 * @param {Object}   compare
 * @param {String[]} oldLines
 * @param {String[]} newLines
 * @param {Object}   options
 * @returns {Object[]}
 */
export function buildUnified(compare, oldLines, newLines, options) {
    const rows = [];
    let   hunk = 0;

    forEachBlock(compare.blocks, options, (block, index, from, to) => {
        if (block.type === "fold") {
            rows.push({ kind : "fold", block : index, count : block.count });
            return;
        }
        if (block.type === "same") {
            for (const step of block.items.slice(from, to)) {
                rows.push({
                    kind      : "same",
                    type      : "same",
                    oldNumber : step.oldIndex + 1,
                    newNumber : step.newIndex + 1,
                    text      : oldLines[step.oldIndex],
                });
            }
            return;
        }

        const pairs = Math.min(block.removed.length, block.added.length);
        const marks = [];
        if (options.markWords) {
            for (let i = 0; i < pairs; i += 1) {
                marks.push(markWords(oldLines[block.removed[i]], newLines[block.added[i]]));
            }
        }
        for (const [ i, oldIndex ] of block.removed.entries()) {
            rows.push({
                kind      : "change",
                type      : "remove",
                hunk,
                oldNumber : oldIndex + 1,
                text      : oldLines[oldIndex],
                parts     : marks[i] ? marks[i].oldParts : null,
            });
        }
        for (const [ i, newIndex ] of block.added.entries()) {
            rows.push({
                kind      : "change",
                type      : "add",
                hunk,
                newNumber : newIndex + 1,
                text      : newLines[newIndex],
                parts     : marks[i] ? marks[i].newParts : null,
            });
        }
        hunk += 1;
    });
    return rows;
}

/**
 * Walks the blocks, folding the middle of a long run of lines that did not
 * change when the options ask for it, and leaving a few around each change.
 * The first and last runs keep no lines on the side that has no change
 * @param {Object[]} blocks
 * @param {Object}   options
 * @param {Function} onBlock
 * @returns {Void}
 */
function forEachBlock(blocks, options, onBlock) {
    const expanded = options.expanded || new Set();

    for (const [ index, block ] of blocks.entries()) {
        if (block.type === "change") {
            onBlock(block, index, 0, 0);
            continue;
        }

        const isFirst = index === 0;
        const isLast  = index === blocks.length - 1;
        const total   = block.items.length;
        const head    = isFirst ? 0 : CONTEXT;
        const tail    = isLast  ? 0 : CONTEXT;

        // A run of a single line more than the context is shown whole, since a
        // fold that hides one line is longer than the line
        if (!options.hideSame || expanded.has(index) || total <= head + tail + 1) {
            onBlock(block, index, 0, total);
            continue;
        }
        if (head) {
            onBlock(block, index, 0, head);
        }
        onBlock({ type : "fold", count : total - head - tail }, index, 0, 0);
        if (tail) {
            onBlock(block, index, total - tail, total);
        }
    }
}



/**
 * Writes the changes out as a patch, the way diff -u does, with a few lines
 * around each change so whoever applies it can find where it goes
 * @param {Object}   compare
 * @param {String[]} oldLines
 * @param {String[]} newLines
 * @param {String}   oldName
 * @param {String}   newName
 * @returns {String}
 */
export function toPatch(compare, oldLines, newLines, oldName, newName) {
    const blocks = compare.blocks;
    const hunks  = [];
    let   hunk   = null;

    for (const [ index, block ] of blocks.entries()) {
        if (block.type === "same") {
            continue;
        }
        const before = blocks[index - 1];
        const after  = blocks[index + 1];

        // A hunk holds every change with less than twice the context between
        // it and the next, since two hunks that close would share their lines
        if (!hunk || before.items.length > CONTEXT * 2) {
            hunk = { lines : [], oldAt : block.oldAt, newAt : block.newAt, oldStart : -1, newStart : -1, oldCount : 0, newCount : 0 };
            hunks.push(hunk);
            if (before) {
                for (const step of before.items.slice(-CONTEXT)) {
                    addPatchLine(hunk, " ", oldLines[step.oldIndex], step.oldIndex, step.newIndex);
                }
            }
        } else if (before) {
            for (const step of before.items) {
                addPatchLine(hunk, " ", oldLines[step.oldIndex], step.oldIndex, step.newIndex);
            }
        }

        for (const oldIndex of block.removed) {
            addPatchLine(hunk, "-", oldLines[oldIndex], oldIndex, -1);
        }
        for (const newIndex of block.added) {
            addPatchLine(hunk, "+", newLines[newIndex], -1, newIndex);
        }

        // The context after, unless the next change is close enough to share
        // it, in which case that change brings the whole run with it
        if (after && (after.items.length > CONTEXT * 2 || index + 1 === blocks.length - 1)) {
            for (const step of after.items.slice(0, CONTEXT)) {
                addPatchLine(hunk, " ", oldLines[step.oldIndex], step.oldIndex, step.newIndex);
            }
        }
    }

    const lines = [ `--- ${oldName || "old"}`, `+++ ${newName || "new"}` ];
    for (const one of hunks) {
        const oldRange = patchRange(one.oldStart, one.oldCount, one.oldAt);
        const newRange = patchRange(one.newStart, one.newCount, one.newAt);
        lines.push(`@@ -${oldRange} +${newRange} @@`);
        lines.push(...one.lines);
    }
    return `${lines.join("\n")}\n`;
}

/**
 * Adds a line to the hunk, counting it on the sides it belongs to, and taking
 * it as where the hunk starts on each when it is the first there
 * @param {Object} hunk
 * @param {String} sign
 * @param {String} text
 * @param {Number} oldIndex
 * @param {Number} newIndex
 * @returns {Void}
 */
function addPatchLine(hunk, sign, text, oldIndex, newIndex) {
    hunk.lines.push(`${sign}${text}`);
    if (oldIndex >= 0) {
        hunk.oldStart = hunk.oldStart < 0 ? oldIndex : hunk.oldStart;
        hunk.oldCount += 1;
    }
    if (newIndex >= 0) {
        hunk.newStart = hunk.newStart < 0 ? newIndex : hunk.newStart;
        hunk.newCount += 1;
    }
}

/**
 * Returns the range of a hunk on one side, the way diff writes it: a side
 * with no lines names the line the change sits after, and a side with one
 * line leaves the count out
 * @param {Number} start
 * @param {Number} count
 * @param {Number} at
 * @returns {String}
 */
function patchRange(start, count, at) {
    if (count === 0) {
        return `${at},0`;
    }
    if (count === 1) {
        return `${start + 1}`;
    }
    return `${start + 1},${count}`;
}
