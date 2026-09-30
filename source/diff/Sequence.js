/**
 * Returns the shortest way from one list to the other, as a list of steps that
 * keep, take out or put in one item each, in the order they are walked. The
 * lists are compared as they are given, so whoever calls turns what it has
 * into numbers first, and the lines of a file that are the same read as equal
 * @param {Number[]} oldItems
 * @param {Number[]} newItems
 * @returns {{type: String, oldIndex: Number, newIndex: Number}[]}
 */
export default function diffSequence(oldItems, newItems) {
    const steps = [];
    walk(oldItems, 0, oldItems.length, newItems, 0, newItems.length, steps);
    return steps;
}

/**
 * Walks the part of both lists between the given ends, splitting it at the
 * middle of the shortest path through it, so no more than a few lines of
 * memory are held however long the lists are. Myers, in the linear space
 * @param {Number[]} a
 * @param {Number}   aLo
 * @param {Number}   aHi
 * @param {Number[]} b
 * @param {Number}   bLo
 * @param {Number}   bHi
 * @param {Object[]} steps
 * @returns {Void}
 */
function walk(a, aLo, aHi, b, bLo, bHi, steps) {
    // What both lists start with is kept as it is
    while (aLo < aHi && bLo < bHi && a[aLo] === b[bLo]) {
        steps.push({ type : "same", oldIndex : aLo, newIndex : bLo });
        aLo += 1;
        bLo += 1;
    }

    // And so is what both end with, once the middle is done
    let suffix = 0;
    while (aLo < aHi - suffix && bLo < bHi - suffix && a[aHi - 1 - suffix] === b[bHi - 1 - suffix]) {
        suffix += 1;
    }
    const aEnd = aHi - suffix;
    const bEnd = bHi - suffix;

    // With one side empty, the other is all that is left to take out or put
    // in. A part with one step in it lands here too, since the rest of it was
    // the same at one end or the other
    if (aLo === aEnd) {
        for (let y = bLo; y < bEnd; y += 1) {
            steps.push({ type : "add", oldIndex : aLo, newIndex : y });
        }
    } else if (bLo === bEnd) {
        for (let x = aLo; x < aEnd; x += 1) {
            steps.push({ type : "remove", oldIndex : x, newIndex : bLo });
        }
    } else {
        const snake = findMiddleSnake(a, aLo, aEnd, b, bLo, bEnd);
        walk(a, aLo, snake.xStart, b, bLo, snake.yStart, steps);
        for (let i = 0; i < snake.xEnd - snake.xStart; i += 1) {
            steps.push({ type : "same", oldIndex : snake.xStart + i, newIndex : snake.yStart + i });
        }
        walk(a, snake.xEnd, aEnd, b, snake.yEnd, bEnd, steps);
    }

    for (let i = suffix; i > 0; i -= 1) {
        steps.push({ type : "same", oldIndex : aHi - i, newIndex : bHi - i });
    }
}

/**
 * Finds a run of equal items that sits on a shortest path through the given
 * part, by searching from both ends at once until the two searches meet
 * @param {Number[]} a
 * @param {Number}   aLo
 * @param {Number}   aHi
 * @param {Number[]} b
 * @param {Number}   bLo
 * @param {Number}   bHi
 * @returns {{xStart: Number, yStart: Number, xEnd: Number, yEnd: Number}}
 */
function findMiddleSnake(a, aLo, aHi, b, bLo, bHi) {
    const n      = aHi - aLo;
    const m      = bHi - bLo;
    const delta  = n - m;
    const isOdd  = (delta & 1) === 1;
    const max    = Math.ceil((n + m) / 2) + 1;
    const offset = max + 1;
    const vf     = new Int32Array(2 * max + 3);
    const vb     = new Int32Array(2 * max + 3);

    vf[offset + 1] = 0;
    vb[offset + 1] = 0;

    for (let d = 0; d <= max; d += 1) {
        // Forward, from the start of both
        for (let k = -d; k <= d; k += 2) {
            let x;
            if (k === -d || (k !== d && vf[offset + k - 1] < vf[offset + k + 1])) {
                x = vf[offset + k + 1];
            } else {
                x = vf[offset + k - 1] + 1;
            }
            let y = x - k;
            const xStart = x;
            const yStart = y;
            while (x < n && y < m && a[aLo + x] === b[bLo + y]) {
                x += 1;
                y += 1;
            }
            vf[offset + k] = x;

            // The other search runs on the reversed lists, so its diagonal k
            // is this one's delta - k, and the two meet when their x add up
            // to the whole length
            const kk = delta - k;
            if (isOdd && kk >= -(d - 1) && kk <= d - 1 && x + vb[offset + kk] >= n) {
                return { xStart : aLo + xStart, yStart : bLo + yStart, xEnd : aLo + x, yEnd : bLo + y };
            }
        }

        // Backward, from the end of both
        for (let k = -d; k <= d; k += 2) {
            let x;
            if (k === -d || (k !== d && vb[offset + k - 1] < vb[offset + k + 1])) {
                x = vb[offset + k + 1];
            } else {
                x = vb[offset + k - 1] + 1;
            }
            let y = x - k;
            const xStart = x;
            const yStart = y;
            while (x < n && y < m && a[aHi - 1 - x] === b[bHi - 1 - y]) {
                x += 1;
                y += 1;
            }
            vb[offset + k] = x;

            const kk = delta - k;
            if (!isOdd && kk >= -d && kk <= d && x + vf[offset + kk] >= n) {
                return { xStart : aHi - x, yStart : bHi - y, xEnd : aHi - xStart, yEnd : bHi - yStart };
            }
        }
    }

    // Two lists always meet, so this is never reached
    return { xStart : aLo, yStart : bLo, xEnd : aLo, yEnd : bLo };
}
