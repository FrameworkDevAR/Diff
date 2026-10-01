import Compare from "../core/Compare.js";
import Utils   from "../core/Utils.js";



// The least the thumb of the map is tall, so there is always some to hold
const MIN_VIEW = 28;



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

    // Which kinds of difference the structure view shows, and how many of
    // each there are
    checks      = { missing : true, type : true, value : true };
    checkCounts = { missing : 0, type : 0, value : 0 };


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

        // The map stands where the scrollbar would, so it also shows which
        // part of the result is seen, and that part can be dragged along
        this.#scroll.addEventListener("scroll", () => {
            this.drawView();
        });
        this.#map.addEventListener("pointerdown", (e) => {
            this.#startDrag(e);
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
        this.checks = { missing : true, type : true, value : true };
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
            html = renderUnified(this.#compare.unifiedRows(options), this.#compare.oldTokens, this.#compare.newTokens);
            break;
        case "tree": {
            const data = this.#compare.structure(options, this.checks);
            this.checkCounts = data.checks;
            html = renderSplit(data.rows, data.oldTokens, data.newTokens);
            break;
        }
        default:
            html = renderSplit(this.#compare.splitRows(options), this.#compare.oldTokens, this.#compare.newTokens);
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
        const view = '<b class="map-view"></b>';

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
        this.#map.innerHTML = view + parts.join("");
        this.drawView();
    }

    /**
     * Draws the part of the result that is seen on the map, as the thumb
     * of a scrollbar, which is not there when all of it is seen
     * @returns {Void}
     */
    drawView() {
        const view = this.#map.querySelector(".map-view");
        if (!(view instanceof HTMLElement)) {
            return;
        }
        const total  = this.#scroll.scrollHeight;
        const height = this.#scroll.clientHeight;
        if (height >= total) {
            view.style.display = "none";
            return;
        }

        // The thumb is never too small to take hold of, so it moves along
        // what is left of the map rather than along all of it
        const track = this.#map.clientHeight;
        const size  = Math.max(MIN_VIEW, height / total * track);
        const top   = this.#scroll.scrollTop / (total - height) * (track - size);

        view.style.display = "block";
        view.style.top     = `${top.toFixed(1)}px`;
        view.style.height  = `${size.toFixed(1)}px`;
    }

    /**
     * Moves the result along with the part of the map that is dragged
     * @param {PointerEvent} event
     * @returns {Void}
     */
    #startDrag(event) {
        const view = event.target;
        if (!(view instanceof HTMLElement) || !view.classList.contains("map-view")) {
            return;
        }
        event.preventDefault();

        const startY   = event.clientY;
        const startTop = this.#scroll.scrollTop;
        const ratio    = (this.#scroll.scrollHeight - this.#scroll.clientHeight) / (this.#map.clientHeight - view.offsetHeight);
        const onMove   = (e) => {
            this.#scroll.scrollTop = startTop + (e.clientY - startY) * ratio;
        };
        const onEnd    = () => {
            view.classList.remove("dragging");
            view.removeEventListener("pointermove", onMove);
        };

        view.classList.add("dragging");
        view.setPointerCapture(event.pointerId);
        view.addEventListener("pointermove", onMove);
        view.addEventListener("pointerup", onEnd, { once : true });
        view.addEventListener("pointercancel", onEnd, { once : true });
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
     * Turns the given check the other way, and draws the structure again
     * without the differences it hides, or with them back
     * @param {String} name
     * @returns {Void}
     */
    toggleCheck(name) {
        const top = this.#scroll.scrollTop;
        this.checks[name] = !this.checks[name];
        this.render();
        this.#scroll.scrollTop = top;
    }

    /**
     * Walks to the given change, and says which it is
     * @param {Number}   index
     * @param {Boolean=} withScroll
     * @returns {Boolean}
     */
    goToIndex(index, withScroll = true) {
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

        const first = elements[0];
        if (withScroll && first instanceof HTMLElement) {
            first.firstElementChild.scrollIntoView({ block : "center", behavior : "smooth" });
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
}



/**
 * Says what a change is on the map: lines taken out, lines put in, both,
 * or a value that changed
 * @param {HTMLElement} element
 * @returns {String}
 */
function mapKind(element) {
    if (element.querySelector(":scope > .diff-text.diff-changed")) {
        return "changed";
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
 * @param {Object[]}   rows
 * @param {Object[][]} oldTokens
 * @param {Object[][]} newTokens
 * @returns {String}
 */
function renderSplit(rows, oldTokens, newTokens) {
    const parts = [ "<div class=\"diff diff-split\">" ];
    for (const row of rows) {
        if (row.kind === "fold") {
            parts.push(renderFold(row));
            continue;
        }
        const hunk = row.kind === "change" ? ` data-hunk="${row.hunk}" data-action="pick-change"` : "";
        parts.push(`<div class="diff-row diff-${row.kind}"${hunk}>${renderCell(row.left, oldTokens)}${renderCell(row.right, newTokens)}</div>`);
    }
    parts.push("</div>");
    return parts.join("");
}

/**
 * Draws the rows of the unified view
 * @param {Object[]}   rows
 * @param {Object[][]} oldTokens
 * @param {Object[][]} newTokens
 * @returns {String}
 */
function renderUnified(rows, oldTokens, newTokens) {
    const parts = [ "<div class=\"diff diff-unified\">" ];
    for (const row of rows) {
        if (row.kind === "fold") {
            parts.push(renderFold(row));
            continue;
        }
        const hunk = row.kind === "change" ? ` data-hunk="${row.hunk}" data-action="pick-change"` : "";
        parts.push(`<div class="diff-row diff-${row.kind}"${hunk}>`);
        parts.push(`<div class="diff-number diff-${row.type}">${row.oldNumber || ""}</div>`);
        parts.push(`<div class="diff-number diff-${row.type}">${row.newNumber || ""}</div>`);
        const tokens = row.type === "add" ? newTokens[row.newNumber - 1] : oldTokens[row.oldNumber - 1];
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
 * the words that changed marked when they were found, and the note that
 * says what the change is after it. The colors and the marks cut the line
 * at their own places, so it is drawn piece by piece between every cut
 * @param {Object}    line
 * @param {?Object[]} tokens
 * @returns {String}
 */
function renderText(line, tokens) {
    const text = line.text || "";
    const note = line.note ? `<i class="diff-note">${Utils.escape(line.note)}</i>` : "";
    if (!text && !note) {
        return "";
    }
    return `<span class="diff-line">${renderPieces(text, line, tokens)}${note}</span>`;
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
