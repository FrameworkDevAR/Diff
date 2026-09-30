import Compare from "../core/Compare.js";
import Utils   from "../core/Utils.js";



// The kinds of node that are a change of their own, and are walked to
const CHANGES = [ "added", "removed", "changed" ];



/**
 * The Result, which draws what was found between the files
 */
export default class Result {

    /** @type {HTMLElement} */
    #element;
    /** @type {HTMLElement} */
    #scroll;
    /** @type {HTMLElement} */
    #count;

    /** @type {?Compare} */
    #compare = null;
    /** @type {Object} */
    #options = {};

    /** @type {Set<Number>} */
    #expanded = new Set();

    #changes = 0;
    #current = -1;

    layout = "split";


    /**
     * Result constructor
     */
    constructor() {
        this.#element = document.querySelector(".result");
        this.#scroll  = document.querySelector(".result-scroll");
        this.#count   = document.querySelector(".steps-count");
    }

    /**
     * Returns how many changes there are in the layout that is shown
     * @returns {Number}
     */
    get changes() {
        return this.#changes;
    }



    /**
     * Shows what the given Compare found, in the given layout
     * @param {Compare} compare
     * @param {Object}  options
     * @param {String}  layout
     * @returns {Void}
     */
    show(compare, options, layout) {
        this.#compare = compare;
        this.#options = options;
        this.#expanded.clear();
        this.setLayout(layout);
    }

    /**
     * Draws the result again in the given layout
     * @param {String} layout
     * @returns {Void}
     */
    setLayout(layout) {
        this.layout = layout;
        this.render();
        this.#scroll.scrollTop  = 0;
        this.#scroll.scrollLeft = 0;
    }

    /**
     * Draws the result in the layout it is in
     * @returns {Void}
     */
    render() {
        if (!this.#compare) {
            return;
        }
        const options = { ...this.#options, expanded : this.#expanded };
        let   html    = "";

        switch (this.layout) {
        case "unified":
            html = renderUnified(this.#compare.unifiedRows(options));
            break;
        case "tree":
            html = renderTree(this.#compare.tree, options);
            break;
        default:
            html = renderSplit(this.#compare.splitRows(options));
        }

        this.#scroll.innerHTML = html;
        this.#element.classList.toggle("result-same", this.#compare.isSame);
        // A change is drawn as several rows, all naming the same one
        const hunks = [ ...this.#scroll.querySelectorAll("[data-hunk]") ].map((element) => element.dataset.hunk);
        this.#changes = new Set(hunks).size;
        this.#current = -1;
        this.setCount();
    }

    /**
     * Says which change is being looked at, of how many there are
     * @returns {Void}
     */
    setCount() {
        const current = this.#current < 0 ? "–" : String(this.#current + 1);
        this.#count.innerHTML = `${current}/${this.#changes}`;
    }



    /**
     * Walks to the next change, or the one before, and says which it is
     * @param {Number} delta
     * @returns {Boolean}
     */
    goTo(delta) {
        if (!this.#changes) {
            return false;
        }

        // Before any is walked to, the next one is the first and the one
        // before is the last
        let index = this.#current + delta;
        if (this.#current < 0) {
            index = delta > 0 ? 0 : this.#changes - 1;
        }
        index = Math.min(Math.max(index, 0), this.#changes - 1);

        for (const element of this.#scroll.querySelectorAll(".current")) {
            element.classList.remove("current");
        }
        const elements = this.#scroll.querySelectorAll(`[data-hunk="${index}"]`);
        for (const element of elements) {
            element.classList.add("current");
        }

        // A change inside a closed branch of the tree is opened up to
        const first = elements[0];
        if (first instanceof HTMLElement) {
            let branch = first.parentElement.closest(".tree-branch");
            while (branch) {
                branch.classList.add("tree-open");
                branch = branch.parentElement.closest(".tree-branch");
            }
            const target = first.classList.contains("diff-row") ? first.firstElementChild : first;
            target.scrollIntoView({ block : "center", behavior : "smooth" });
        }

        this.#current = index;
        this.setCount();
        return true;
    }

    /**
     * Shows the lines a fold was hiding, keeping the rest where it was
     * @param {Number} block
     * @returns {Void}
     */
    expandFold(block) {
        const top  = this.#scroll.scrollTop;
        const left = this.#scroll.scrollLeft;

        this.#expanded.add(block);
        this.render();
        this.#scroll.scrollTop  = top;
        this.#scroll.scrollLeft = left;
    }

    /**
     * Opens or closes the branch of the tree the row belongs to
     * @param {HTMLElement} row
     * @returns {Void}
     */
    toggleNode(row) {
        const branch = row.closest(".tree-branch");
        if (branch) {
            branch.classList.toggle("tree-open");
        }
    }
}



/**
 * Draws the rows of the side by side view
 * @param {Object[]} rows
 * @returns {String}
 */
function renderSplit(rows) {
    const parts = [ "<div class=\"diff diff-split\">" ];
    for (const row of rows) {
        if (row.kind === "fold") {
            parts.push(renderFold(row));
            continue;
        }
        const hunk = row.kind === "change" ? ` data-hunk="${row.hunk}"` : "";
        parts.push(`<div class="diff-row diff-${row.kind}"${hunk}>${renderCell(row.left)}${renderCell(row.right)}</div>`);
    }
    parts.push("</div>");
    return parts.join("");
}

/**
 * Draws the rows of the unified view
 * @param {Object[]} rows
 * @returns {String}
 */
function renderUnified(rows) {
    const parts = [ "<div class=\"diff diff-unified\">" ];
    for (const row of rows) {
        if (row.kind === "fold") {
            parts.push(renderFold(row));
            continue;
        }
        const hunk = row.kind === "change" ? ` data-hunk="${row.hunk}"` : "";
        parts.push(`<div class="diff-row diff-${row.kind}"${hunk}>`);
        parts.push(`<div class="diff-number diff-${row.type}">${row.oldNumber || ""}</div>`);
        parts.push(`<div class="diff-number diff-${row.type}">${row.newNumber || ""}</div>`);
        parts.push(`<div class="diff-text diff-${row.type}">${renderText(row)}</div>`);
        parts.push("</div>");
    }
    parts.push("</div>");
    return parts.join("");
}

/**
 * Draws a row that stands for the lines it hides
 * @param {Object} row
 * @returns {String}
 */
function renderFold(row) {
    const text = row.count === 1 ? "1 unchanged line" : `${row.count} unchanged lines`;
    return `<div class="diff-row diff-fold"><div data-action="expand-fold" data-block="${row.block}">${text}</div></div>`;
}

/**
 * Draws one side of a row of the side by side view
 * @param {Object} side
 * @returns {String}
 */
function renderCell(side) {
    const number = side.number || "";
    return `<div class="diff-number diff-${side.type}">${number}</div><div class="diff-text diff-${side.type}">${renderText(side)}</div>`;
}

/**
 * Draws the text of a line, with the words that changed marked when they
 * were found
 * @param {Object} line
 * @returns {String}
 */
function renderText(line) {
    if (!line.parts) {
        return Utils.escape(line.text || "");
    }
    return line.parts.map((part) => {
        const text = Utils.escape(part.text);
        return part.isMarked ? `<mark>${text}</mark>` : text;
    }).join("");
}



/**
 * Draws the tree of a JSON comparison
 * @param {Object} tree
 * @param {Object} options
 * @returns {String}
 */
function renderTree(tree, options) {
    const state = { hunk : 0, options };
    const root  = tree.root;
    const html  = root.children
        ? root.children.map((child) => renderNode(child, state)).join("")
        : renderNode({ ...root, key : "$" }, state);
    return `<div class="tree">${html}</div>`;
}

/**
 * Draws a node of the tree and whatever it holds. What is inside a branch
 * that was added or removed whole went with it, and is not a change of its
 * own to walk to
 * @param {Object}   node
 * @param {Object}   state
 * @param {Boolean=} isInside
 * @returns {String}
 */
function renderNode(node, state, isInside = false) {
    if (node.type === "same" && !state.options.showSameValues) {
        return "";
    }

    const hunk = CHANGES.includes(node.type) && !isInside ? ` data-hunk="${state.hunk++}"` : "";
    const key  = `<span class="tree-key">${Utils.escape(node.key)}</span>`;

    if (node.children) {
        // A branch with a change in it is open, since the change is why the
        // tree is looked at, and one that only holds the same is closed
        const isOpen   = node.type === "nested" ? " tree-open" : "";
        const value    = node.type === "removed" ? node.oldValue : node.newValue;
        const isWhole  = isInside || node.type === "added" || node.type === "removed";
        const children = node.children.map((child) => renderNode(child, state, isWhole)).join("");
        return `<div class="tree-node tree-branch${isOpen}" data-type="${node.type}"${hunk}>` +
            `<div class="tree-row" data-action="toggle-node"><i class="arrow"></i>${key}` +
            `<span class="tree-summary">${renderSummary(value)}</span>${renderBadges(node)}</div>` +
            `<div class="tree-children">${children}</div></div>`;
    }

    let values = "";
    switch (node.type) {
    case "added":
        values = renderValue(node.newValue, "tree-new");
        break;
    case "removed":
        values = renderValue(node.oldValue, "tree-old");
        break;
    case "changed":
        values = `${renderValue(node.oldValue, "tree-old")}<i class="tree-to"></i>${renderValue(node.newValue, "tree-new")}`;
        break;
    default:
        values = renderValue(node.newValue, "");
    }
    return `<div class="tree-node" data-type="${node.type}"${hunk}><div class="tree-row">${key}${values}</div></div>`;
}

/**
 * Draws a value as it is written in JSON, in the color of its kind
 * @param {*}      value
 * @param {String} className
 * @returns {String}
 */
function renderValue(value, className) {
    let kind = typeof value;
    let text = "";

    if (value === null) {
        kind = "null";
        text = "null";
    } else if (kind === "object") {
        return `<span class="tree-value is-object ${className}">${renderSummary(value)}</span>`;
    } else if (kind === "string") {
        text = `"${Utils.escape(value)}"`;
    } else {
        text = String(value);
    }
    return `<span class="tree-value is-${kind} ${className}">${text}</span>`;
}

/**
 * Says what a list or an object holds, without opening it
 * @param {*} value
 * @returns {String}
 */
function renderSummary(value) {
    if (Array.isArray(value)) {
        return value.length === 1 ? "[ 1 item ]" : `[ ${value.length} items ]`;
    }
    const total = Object.keys(value).length;
    return total === 1 ? "{ 1 key }" : `{ ${total} keys }`;
}

/**
 * Draws the counts of what changed inside a branch
 * @param {Object} node
 * @returns {String}
 */
function renderBadges(node) {
    if (node.type !== "nested") {
        return "";
    }
    const parts = [];
    if (node.counts.added) {
        parts.push(`<b class="badge-added">+${node.counts.added}</b>`);
    }
    if (node.counts.removed) {
        parts.push(`<b class="badge-removed">−${node.counts.removed}</b>`);
    }
    if (node.counts.changed) {
        parts.push(`<b class="badge-changed">~${node.counts.changed}</b>`);
    }
    return `<span class="tree-badges">${parts.join("")}</span>`;
}
