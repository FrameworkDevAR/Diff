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
    /** @type {HTMLElement} */
    #map;
    /** @type {HTMLElement} */
    #hscroll;

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
        this.#map     = document.querySelector(".result-map");
        this.#hscroll = document.querySelector(".result-hscroll");

        // The lines are moved along together by the one bar, since a side
        // scrolled on its own would leave the other behind
        this.#hscroll.addEventListener("scroll", () => {
            this.#scroll.style.setProperty("--shift-x", `${this.#hscroll.scrollLeft}px`);
        });

        // The map and the bar follow the width of the result, which moves
        // the rows when the lines wrap and how much of a line is seen
        new ResizeObserver(() => {
            this.drawMap();
            this.setWidth();
        }).observe(this.#scroll);
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
        this.#hscroll.scrollLeft = 0;
        this.render();
        this.#scroll.scrollTop = 0;
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
            html = renderUnified(this.#compare, this.#compare.unifiedRows(options));
            break;
        case "tree":
            html = renderTree(this.#compare.tree, options);
            break;
        default:
            html = renderSplit(this.#compare, this.#compare.splitRows(options));
        }

        this.#scroll.innerHTML = html;
        this.#element.classList.toggle("result-same", this.#compare.isSame);
        // A change is drawn as several rows, all naming the same one
        const hunks = [ ...this.#scroll.querySelectorAll("[data-hunk]") ].map((element) => element.dataset.hunk);
        this.#changes = new Set(hunks).size;
        this.#current = -1;
        this.setCount();
        this.setWidth();
        this.drawMap();
    }

    /**
     * Sizes the bar that moves the lines along by how much of the longest
     * one runs past its cell, or takes the bar away when every line fits
     * or the lines wrap
     * @returns {Void}
     */
    setWidth() {
        const cell = this.#scroll.querySelector(".diff-text");
        if (!this.#compare || !cell || this.#options.wrapLines || this.layout === "tree") {
            this.#hscroll.classList.remove("visible");
            this.#scroll.style.setProperty("--shift-x", "0px");
            return;
        }

        // The lines are measured by their longest, in the width of one
        // character, which is the same for all of them in a mono font
        let longest = 0;
        for (const lines of [ this.#compare.oldLines, this.#compare.newLines ]) {
            for (const line of lines) {
                longest = Math.max(longest, line.replace(/\t/g, "    ").length);
            }
        }

        const probe = document.createElement("span");
        probe.className   = "diff-line";
        probe.textContent = "M".repeat(100);
        cell.appendChild(probe);
        const charWidth = probe.getBoundingClientRect().width / 100;
        probe.remove();

        const padding = cell.offsetWidth - cell.clientWidth + 32;
        const visible = cell.offsetWidth - padding;
        const needed  = Math.ceil(longest * charWidth);
        if (needed <= visible) {
            this.#hscroll.classList.remove("visible");
            this.#hscroll.scrollLeft = 0;
            this.#scroll.style.setProperty("--shift-x", "0px");
            return;
        }

        this.#hscroll.classList.add("visible");
        this.#hscroll.firstElementChild.setAttribute("style", `width:${this.#hscroll.clientWidth + needed - visible}px`);
        this.#scroll.style.setProperty("--shift-x", `${this.#hscroll.scrollLeft}px`);
    }

    /**
     * Moves the lines along by the given amount, for a wheel that goes
     * sideways over the result
     * @param {Number} delta
     * @returns {Boolean}
     */
    scrollBy(delta) {
        if (!this.#hscroll.classList.contains("visible")) {
            return false;
        }
        this.#hscroll.scrollLeft += delta;
        return true;
    }

    /**
     * Draws every change as a mark down the side of the result, where it
     * sits along the whole of it, the way an editor marks its scrollbar
     * @returns {Void}
     */
    drawMap() {
        const total = this.#scroll.scrollHeight;
        if (!this.#compare || !total || this.#compare.isSame) {
            this.#map.innerHTML = "";
            return;
        }

        // A change is drawn as several rows, and the mark covers them all
        const hunks = new Map();
        for (const element of this.#scroll.querySelectorAll("[data-hunk]")) {
            const box    = element.firstElementChild;
            const index  = Number(element.dataset.hunk);
            const top    = box.offsetTop;
            const bottom = top + box.offsetHeight;
            const kind   = mapKind(element);

            const hunk = hunks.get(index);
            if (!hunk) {
                hunks.set(index, { top, bottom, kinds : new Set([ kind ]) });
                continue;
            }
            hunk.top    = Math.min(hunk.top, top);
            hunk.bottom = Math.max(hunk.bottom, bottom);
            hunk.kinds.add(kind);
        }

        const parts = [];
        for (const [ index, hunk ] of hunks) {
            const kind    = hunk.kinds.size > 1 || hunk.kinds.has("both") ? "both" : [ ...hunk.kinds ][0];
            const current = index === this.#current ? " current" : "";
            const top     = (hunk.top / total * 100).toFixed(3);
            const height  = ((hunk.bottom - hunk.top) / total * 100).toFixed(3);
            parts.push(`<i class="map-${kind}${current}" data-action="map-change" data-hunk="${index}" style="top:${top}%;height:${height}%"></i>`);
        }
        this.#map.innerHTML = parts.join("");
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
        return this.goToIndex(index);
    }

    /**
     * Walks to the given change, and says which it is
     * @param {Number} index
     * @returns {Boolean}
     */
    goToIndex(index) {
        if (!this.#changes) {
            return false;
        }
        index = Math.min(Math.max(index, 0), this.#changes - 1);

        for (const element of this.#element.querySelectorAll(".current")) {
            element.classList.remove("current");
        }
        const elements = this.#scroll.querySelectorAll(`[data-hunk="${index}"]`);
        for (const element of [ ...elements, ...this.#map.querySelectorAll(`[data-hunk="${index}"]`) ]) {
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
        const left = this.#hscroll.scrollLeft;

        this.#expanded.add(block);
        this.render();
        this.#scroll.scrollTop = top;
        this.#hscroll.scrollLeft = left;
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
 * Says what a change is on the map: lines taken out, lines put in, both,
 * or a value of the tree that changed
 * @param {HTMLElement} element
 * @returns {String}
 */
function mapKind(element) {
    if (element.classList.contains("tree-node")) {
        switch (element.dataset.type) {
        case "added":
            return "add";
        case "removed":
            return "remove";
        default:
            return "changed";
        }
    }
    const hasRemove = element.querySelector(":scope > .diff-text.diff-remove") !== null;
    const hasAdd    = element.querySelector(":scope > .diff-text.diff-add") !== null;
    if (hasRemove && hasAdd) {
        return "both";
    }
    return hasRemove ? "remove" : "add";
}

/**
 * Draws the rows of the side by side view
 * @param {Compare}  compare
 * @param {Object[]} rows
 * @returns {String}
 */
function renderSplit(compare, rows) {
    const parts = [ "<div class=\"diff diff-split\">" ];
    for (const row of rows) {
        if (row.kind === "fold") {
            parts.push(renderFold(row));
            continue;
        }
        const hunk = row.kind === "change" ? ` data-hunk="${row.hunk}"` : "";
        parts.push(`<div class="diff-row diff-${row.kind}"${hunk}>${renderCell(row.left, compare.oldTokens)}${renderCell(row.right, compare.newTokens)}</div>`);
    }
    parts.push("</div>");
    return parts.join("");
}

/**
 * Draws the rows of the unified view
 * @param {Compare}  compare
 * @param {Object[]} rows
 * @returns {String}
 */
function renderUnified(compare, rows) {
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
        const tokens = row.type === "add" ? compare.newTokens[row.newNumber - 1] : compare.oldTokens[row.oldNumber - 1];
        parts.push(`<div class="diff-text diff-${row.type}">${renderText(row, tokens)}</div>`);
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
 * @param {Object}     side
 * @param {Object[][]} tokens
 * @returns {String}
 */
function renderCell(side, tokens) {
    const number = side.number || "";
    return `<div class="diff-number diff-${side.type}">${number}</div>` +
        `<div class="diff-text diff-${side.type}">${renderText(side, side.number ? tokens[side.number - 1] : null)}</div>`;
}

/**
 * Draws the text of a line, colored the way its language is written, with
 * the words that changed marked when they were found. The two cut the line
 * at their own places, so it is drawn piece by piece between every cut
 * @param {Object}    line
 * @param {?Object[]} tokens
 * @returns {String}
 */
function renderText(line, tokens) {
    const text = line.text || "";
    if (!text) {
        return "";
    }
    return `<span class="diff-line">${renderPieces(text, line, tokens)}</span>`;
}

/**
 * Draws the pieces of a line, between every cut of the colors and the marks
 * @param {String}    text
 * @param {Object}    line
 * @param {?Object[]} tokens
 * @returns {String}
 */
function renderPieces(text, line, tokens) {
    // The marks are given as the parts of the line, one after the other, and
    // are read as where each marked part starts and ends
    const marks = [];
    let   at    = 0;
    for (const part of line.parts || []) {
        if (part.isMarked) {
            marks.push({ start : at, end : at + part.text.length });
        }
        at += part.text.length;
    }

    const cuts = new Set([ 0, text.length ]);
    for (const one of [ ...marks, ...(tokens || []) ]) {
        cuts.add(one.start);
        cuts.add(one.end);
    }
    const places = [ ...cuts ].sort((a, b) => a - b);

    const parts    = [];
    let   isMarked = false;
    let   mark     = 0;
    let   token    = 0;
    for (let i = 0; i < places.length - 1; i += 1) {
        const start = places[i];
        const end   = places[i + 1];
        while (mark < marks.length && marks[mark].end <= start) {
            mark += 1;
        }
        while (tokens && token < tokens.length && tokens[token].end <= start) {
            token += 1;
        }

        const marked = mark < marks.length && marks[mark].start <= start;
        const type   = tokens && token < tokens.length && tokens[token].start <= start ? tokens[token].type : "";
        if (marked !== isMarked) {
            parts.push(marked ? "<mark>" : "</mark>");
            isMarked = marked;
        }
        const piece = Utils.escape(text.slice(start, end));
        parts.push(type ? `<span class="hl-${type}">${piece}</span>` : piece);
    }
    if (isMarked) {
        parts.push("</mark>");
    }
    return parts.join("");
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
