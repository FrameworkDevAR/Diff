import diffSequence from "./Sequence.js";



// How much two items of a list have to share to be read as one that changed
const MIN_ALIKE = 0.3;


/**
 * Compares two JSON values by what they hold rather than by how they are
 * written, and returns the tree of the differences with the counts of what
 * was added, removed and changed
 * @param {*} oldValue
 * @param {*} newValue
 * @returns {{root: Object, added: Number, removed: Number, changed: Number}}
 */
export function compareJson(oldValue, newValue) {
    const root = compareValues("", oldValue, newValue);
    return { root, ...root.counts };
}

/**
 * Returns the kind of the value, of the three that are compared apart
 * @param {*} value
 * @returns {String}
 */
export function kindOf(value) {
    if (Array.isArray(value)) {
        return "array";
    }
    if (value !== null && typeof value === "object") {
        return "object";
    }
    return "value";
}

/**
 * Returns the value written the same way whichever order its keys came in,
 * so two objects that hold the same read as equal
 * @param {*} value
 * @returns {String}
 */
export function stableStringify(value) {
    return JSON.stringify(sortKeys(value));
}

/**
 * Returns a copy of the value with the keys of every object in it sorted
 * @param {*} value
 * @returns {*}
 */
export function sortKeys(value) {
    const kind = kindOf(value);
    if (kind === "array") {
        return value.map(sortKeys);
    }
    if (kind === "object") {
        const result = {};
        for (const key of Object.keys(value).sort()) {
            result[key] = sortKeys(value[key]);
        }
        return result;
    }
    return value;
}



/**
 * Compares the two values under the given key and returns the node of the
 * tree for them: the same, changed, or a branch with what changed inside it
 * @param {String} key
 * @param {*}      oldValue
 * @param {*}      newValue
 * @returns {Object}
 */
function compareValues(key, oldValue, newValue) {
    const oldKind = kindOf(oldValue);
    const newKind = kindOf(newValue);

    // Two of another kind are a change from one to the other, as two plain
    // values that differ are. A list and an object have nothing to walk
    if (oldKind !== newKind || oldKind === "value") {
        if (oldKind === "value" && newKind === "value" && oldValue === newValue) {
            return createNode(key, "same", oldValue, newValue, null);
        }
        return createNode(key, "changed", oldValue, newValue, null);
    }

    const children = oldKind === "object"
        ? compareObjects(oldValue, newValue)
        : compareArrays(oldValue, newValue);
    const type = children.some((child) => child.type !== "same") ? "nested" : "same";
    return createNode(key, type, oldValue, newValue, children);
}

/**
 * Compares two objects key by key. The keys go in the order of the new object,
 * and a key that is gone goes after the one that came before it
 * @param {Object} oldValue
 * @param {Object} newValue
 * @returns {Object[]}
 */
function compareObjects(oldValue, newValue) {
    const oldKeys = Object.keys(oldValue);
    const newKeys = Object.keys(newValue);
    const keys    = [ ...newKeys ];

    for (const [ index, key ] of oldKeys.entries()) {
        if (key in newValue) {
            continue;
        }
        let at = 0;
        for (let i = index - 1; i >= 0; i -= 1) {
            const position = keys.indexOf(oldKeys[i]);
            if (position >= 0) {
                at = position + 1;
                break;
            }
        }
        keys.splice(at, 0, key);
    }

    return keys.map((key) => {
        if (!(key in oldValue)) {
            return createLeaf(key, "added", newValue[key]);
        }
        if (!(key in newValue)) {
            return createLeaf(key, "removed", oldValue[key]);
        }
        return compareValues(key, oldValue[key], newValue[key]);
    });
}

/**
 * Compares two lists item by item, finding the items that stayed wherever
 * they moved to. An item taken out where another was put in is compared with
 * it when both are of a kind that can be walked
 * @param {Array} oldValue
 * @param {Array} newValue
 * @returns {Object[]}
 */
function compareArrays(oldValue, newValue) {
    const ids  = new Map();
    const toID = (item) => {
        const text = stableStringify(item);
        if (!ids.has(text)) {
            ids.set(text, ids.size);
        }
        return ids.get(text);
    };

    const steps  = diffSequence(oldValue.map(toID), newValue.map(toID));
    const result = [];
    let   run    = null;

    // An item taken out is compared with the item put in that is most like
    // it, when the two share enough, so an object that changed reads as one
    // that changed and not as one gone and another come. The rest go in the
    // order they sit in, the ones put in before the ones taken out
    const closeRun = () => {
        if (!run) {
            return;
        }
        const pairs = new Map();
        const taken = new Set();
        for (const oldIndex of run.removed) {
            let best = { newIndex : -1, score : 0 };
            for (const newIndex of run.added) {
                if (!taken.has(newIndex)) {
                    const score = similarity(oldValue[oldIndex], newValue[newIndex]);
                    if (score > best.score) {
                        best = { newIndex, score };
                    }
                }
            }
            if (best.score >= MIN_ALIKE) {
                pairs.set(best.newIndex, oldIndex);
                taken.add(best.newIndex);
            }
        }

        const items = [];
        for (const newIndex of run.added) {
            const oldIndex = pairs.get(newIndex);
            if (oldIndex !== undefined) {
                const node = compareValues(`[${newIndex}]`, oldValue[oldIndex], newValue[newIndex]);
                node.oldIndex = oldIndex;
                items.push({ index : newIndex, order : 0, node });
            } else {
                items.push({ index : newIndex, order : 0, node : createLeaf(`[${newIndex}]`, "added", newValue[newIndex]) });
            }
        }
        for (const oldIndex of run.removed) {
            if (![ ...pairs.values() ].includes(oldIndex)) {
                items.push({ index : oldIndex, order : 1, node : createLeaf(`[${oldIndex}]`, "removed", oldValue[oldIndex]) });
            }
        }
        items.sort((a, b) => a.index - b.index || a.order - b.order);
        for (const item of items) {
            result.push(item.node);
        }
        run = null;
    };

    for (const step of steps) {
        if (step.type === "same") {
            closeRun();
            result.push(compareValues(`[${step.newIndex}]`, oldValue[step.oldIndex], newValue[step.newIndex]));
            continue;
        }
        if (!run) {
            run = { removed : [], added : [] };
        }
        if (step.type === "remove") {
            run.removed.push(step.oldIndex);
        } else {
            run.added.push(step.newIndex);
        }
    }
    closeRun();
    return result;
}

/**
 * Returns how much two items of a list are alike, from none to all: the
 * share of the keys of two objects that hold the same, or of the items of
 * two lists that sit at the same place. Two of a kind that cannot be walked
 * are never alike, since one that changed reads better as taken out and
 * put in
 * @param {*} oldItem
 * @param {*} newItem
 * @returns {Number}
 */
function similarity(oldItem, newItem) {
    const kind = kindOf(oldItem);
    if (kind === "value" || kind !== kindOf(newItem)) {
        return 0;
    }

    if (kind === "array") {
        const total = Math.max(oldItem.length, newItem.length);
        if (!total) {
            return 1;
        }
        let equal = 0;
        for (let i = 0; i < Math.min(oldItem.length, newItem.length); i += 1) {
            if (stableStringify(oldItem[i]) === stableStringify(newItem[i])) {
                equal += 1;
            }
        }
        return equal / total;
    }

    const keys = new Set([ ...Object.keys(oldItem), ...Object.keys(newItem) ]);
    if (!keys.size) {
        return 1;
    }
    let equal = 0;
    for (const key of keys) {
        if (key in oldItem && key in newItem && stableStringify(oldItem[key]) === stableStringify(newItem[key])) {
            equal += 1;
        }
    }
    return equal / keys.size;
}

/**
 * Returns a node that was added or removed whole, which counts the once
 * whatever it holds
 * @param {String} key
 * @param {String} type
 * @param {*}      value
 * @returns {Object}
 */
function createLeaf(key, type, value) {
    return createNode(key, type, type === "removed" ? value : undefined, type === "added" ? value : undefined, null);
}

/**
 * Returns a node of the tree, with the counts of what changed in it
 * @param {String}    key
 * @param {String}    type
 * @param {*}         oldValue
 * @param {*}         newValue
 * @param {?Object[]} children
 * @returns {Object}
 */
function createNode(key, type, oldValue, newValue, children) {
    const counts = { added : 0, removed : 0, changed : 0 };
    if (children) {
        for (const child of children) {
            counts.added   += child.counts.added;
            counts.removed += child.counts.removed;
            counts.changed += child.counts.changed;
        }
    } else if (type !== "same") {
        counts[type] = 1;
    }

    const kind = kindOf(newValue !== undefined ? newValue : oldValue);
    return { key, type, kind, oldValue, newValue, children, counts };
}
