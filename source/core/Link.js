// The layouts a link can ask for
const LAYOUTS = [ "split", "unified", "tree" ];



/**
 * Reads the two files a link carries after its #, which come either written
 * out, as "old=...&new=...", or packed, as "z=..." with the same fields as
 * JSON, gzipped and in base64. Nothing after the # ever leaves the browser
 * @param {String} hash
 * @returns {Promise<?{old: Object, new: Object, layout: String}>}
 */
async function read(hash) {
    let fields = parseFields(hash.replace(/^#/, ""));
    if (fields.z) {
        try {
            fields = JSON.parse(await unpack(fields.z));
        } catch {
            throw new Error("The link is not complete");
        }
    }

    const oldText = toText(fields.old);
    const newText = toText(fields.new);
    if (!oldText && !newText) {
        return null;
    }
    return {
        old    : { name : toText(fields.oldName), text : oldText },
        new    : { name : toText(fields.newName), text : newText },
        layout : LAYOUTS.includes(fields.layout) ? fields.layout : "",
    };
}



/**
 * Splits the fields of a link apart. A plus is left as a plus, since code
 * is full of them, so a space has to come as %20
 * @param {String} text
 * @returns {Object}
 */
function parseFields(text) {
    const result = {};
    for (const part of text.split("&")) {
        const at = part.indexOf("=");
        if (at <= 0) {
            continue;
        }
        const key   = part.slice(0, at);
        const value = part.slice(at + 1);
        try {
            result[key] = decodeURIComponent(value);
        } catch {
            // A stray % is taken as it was written
            result[key] = value;
        }
    }
    return result;
}

/**
 * Returns the value as text, with the lines ending the one way
 * @param {*} value
 * @returns {String}
 */
function toText(value) {
    return typeof value === "string" ? value.replace(/\r\n?/g, "\n") : "";
}

/**
 * Reads the text back from its base64, in either of its alphabets
 * @param {String} packed
 * @returns {Promise<String>}
 */
async function unpack(packed) {
    const binary = atob(packed.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, ""));
    const bytes  = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const stream = new Blob([ bytes ]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).text();
}




// The public API
export default {
    read,
};
