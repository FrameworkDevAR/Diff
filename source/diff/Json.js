import diffSequence from "./Sequence.js";



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

    const closeRun = () => {
        if (!run) {
            return;
        }
        const total = Math.max(run.removed.length, run.added.length);
        for (let i = 0; i < total; i += 1) {
            const oldIndex = run.removed[i];
            const newIndex = run.added[i];
            if (oldIndex !== undefined && newIndex !== undefined &&
                kindOf(oldValue[oldIndex]) !== "value" && kindOf(oldValue[oldIndex]) === kindOf(newValue[newIndex])
            ) {
                const node = compareValues(`[${newIndex}]`, oldValue[oldIndex], newValue[newIndex]);
                node.oldIndex = oldIndex;
                result.push(node);
                continue;
            }
            if (oldIndex !== undefined) {
                result.push(createLeaf(`[${oldIndex}]`, "removed", oldValue[oldIndex]));
            }
            if (newIndex !== undefined) {
                result.push(createLeaf(`[${newIndex}]`, "added", newValue[newIndex]));
            }
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
 * Returns a node that was added or removed whole, with whatever it holds
 * marked the same way so it can be opened, and counted the once
 * @param {String} key
 * @param {String} type
 * @param {*}      value
 * @returns {Object}
 */
function createLeaf(key, type, value) {
    const kind     = kindOf(value);
    let   children = null;

    if (kind === "object") {
        children = Object.keys(value).map((name) => createLeaf(name, type, value[name]));
    } else if (kind === "array") {
        children = value.map((item, index) => createLeaf(`[${index}]`, type, item));
    }

    const node = createNode(key, type, type === "removed" ? value : undefined, type === "added" ? value : undefined, children);
    node.counts = { added : 0, removed : 0, changed : 0 };
    node.counts[type] = 1;
    return node;
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
