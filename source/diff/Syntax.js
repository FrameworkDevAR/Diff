// The words most languages of the C family keep for themselves
const CLIKE_KEYWORDS = [
    "abstract", "as", "async", "await", "break", "case", "catch", "class", "const", "continue",
    "default", "defer", "delete", "do", "else", "enum", "export", "extends", "final", "finally",
    "fn", "for", "from", "func", "function", "get", "go", "if", "impl", "implements", "import",
    "in", "instanceof", "interface", "internal", "let", "loop", "match", "mut", "namespace", "new",
    "of", "override", "package", "private", "protected", "pub", "public", "readonly", "return",
    "select", "set", "static", "struct", "super", "switch", "this", "throw", "throws", "trait",
    "try", "type", "typeof", "use", "using", "var", "void", "where", "while", "with", "yield",
];
const CLIKE_CONSTANTS = [ "true", "false", "null", "undefined", "NaN", "Infinity", "nil", "None", "self" ];

// What each language is made of: the files it is found in, the words it
// keeps, how its comments and strings are written, and what else it colors
const LANGUAGES = {
    json : {
        name       : "JSON",
        extensions : [ "json", "jsonc", "json5" ],
        keywords   : [],
        constants  : [ "true", "false", "null" ],
        strings    : [ "\"" ],
        keyStrings : true,
    },
    javascript : {
        name         : "JavaScript",
        extensions   : [ "js", "mjs", "cjs", "jsx" ],
        keywords     : CLIKE_KEYWORDS,
        constants    : CLIKE_CONSTANTS,
        strings      : [ "\"", "'", "`" ],
        multiline    : [ "`" ],
        lineComment  : [ "//" ],
        blockComment : [ "/*", "*/" ],
        functions    : true,
    },
    typescript : {
        name         : "TypeScript",
        extensions   : [ "ts", "tsx", "mts", "cts" ],
        keywords     : [ ...CLIKE_KEYWORDS, "declare", "keyof", "satisfies", "unknown", "never", "any", "string", "number", "boolean" ],
        constants    : CLIKE_CONSTANTS,
        strings      : [ "\"", "'", "`" ],
        multiline    : [ "`" ],
        lineComment  : [ "//" ],
        blockComment : [ "/*", "*/" ],
        functions    : true,
    },
    php : {
        name         : "PHP",
        extensions   : [ "php" ],
        keywords     : [
            ...CLIKE_KEYWORDS, "array", "callable", "clone", "declare", "echo", "elseif", "empty",
            "endfor", "endforeach", "endif", "endswitch", "endwhile", "foreach", "global", "include",
            "include_once", "insteadof", "isset", "list", "match", "print", "readonly", "require",
            "require_once", "unset", "int", "float", "string", "bool", "mixed", "never", "iterable",
            "object", "and", "or", "xor", "not",
        ],
        constants    : [ "true", "false", "null", "TRUE", "FALSE", "NULL" ],
        strings      : [ "\"", "'" ],
        lineComment  : [ "//", "#" ],
        blockComment : [ "/*", "*/" ],
        variables    : true,
        functions    : true,
    },
    clike : {
        name         : "Code",
        extensions   : [ "c", "h", "cpp", "hpp", "cc", "cs", "java", "kt", "kts", "swift", "go", "rs", "dart", "scala", "m" ],
        keywords     : [ ...CLIKE_KEYWORDS, "int", "float", "double", "char", "bool", "long", "short", "unsigned", "signed", "string", "guard", "val", "fun", "when", "sealed", "data", "object" ],
        constants    : CLIKE_CONSTANTS,
        strings      : [ "\"", "'" ],
        lineComment  : [ "//" ],
        blockComment : [ "/*", "*/" ],
        functions    : true,
    },
    css : {
        name         : "CSS",
        extensions   : [ "css", "scss", "sass", "less" ],
        keywords     : [ "important" ],
        constants    : [],
        strings      : [ "\"", "'" ],
        lineComment  : [ "//" ],
        blockComment : [ "/*", "*/" ],
        properties   : true,
        atRules      : true,
        colors       : true,
        units        : true,
    },
    html : {
        name       : "HTML",
        extensions : [ "html", "htm", "xml", "svg", "vue", "xhtml", "xsl" ],
        markup     : true,
    },
    sql : {
        name         : "SQL",
        extensions   : [ "sql" ],
        keywords     : [
            "select", "from", "where", "insert", "into", "values", "update", "set", "delete", "create",
            "table", "alter", "drop", "index", "unique", "primary", "key", "foreign", "references",
            "join", "inner", "left", "right", "outer", "on", "as", "and", "or", "not", "in", "is",
            "like", "between", "order", "by", "group", "having", "limit", "offset", "union", "all",
            "distinct", "case", "when", "then", "else", "end", "if", "exists", "default", "constraint",
            "add", "column", "modify", "change", "rename", "to", "begin", "commit", "rollback",
            "int", "integer", "bigint", "smallint", "tinyint", "varchar", "char", "text", "longtext",
            "datetime", "date", "timestamp", "decimal", "float", "double", "boolean", "json", "blob",
            "auto_increment", "unsigned", "engine", "charset", "collate", "comment", "using", "with",
        ],
        caseless     : true,
        constants    : [ "true", "false", "null" ],
        strings      : [ "'", "\"", "`" ],
        lineComment  : [ "--", "#" ],
        blockComment : [ "/*", "*/" ],
    },
    python : {
        name        : "Python",
        extensions  : [ "py" ],
        keywords    : [
            "and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del", "elif",
            "else", "except", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda",
            "nonlocal", "not", "or", "pass", "raise", "return", "try", "while", "with", "yield",
        ],
        constants   : [ "True", "False", "None", "self" ],
        strings     : [ "\"\"\"", "'''", "\"", "'" ],
        multiline   : [ "\"\"\"", "'''" ],
        lineComment : [ "#" ],
        functions   : true,
    },
    shell : {
        name        : "Shell",
        extensions  : [ "sh", "bash", "zsh", "fish" ],
        keywords    : [
            "if", "then", "else", "elif", "fi", "for", "while", "until", "do", "done", "case", "esac",
            "in", "function", "return", "exit", "export", "local", "readonly", "source", "alias",
        ],
        constants   : [ "true", "false" ],
        strings     : [ "\"", "'" ],
        lineComment : [ "#" ],
        variables   : true,
    },
    yaml : {
        name        : "YAML",
        extensions  : [ "yml", "yaml" ],
        keywords    : [],
        constants   : [ "true", "false", "null", "yes", "no", "on", "off", "~" ],
        strings     : [ "\"", "'" ],
        lineComment : [ "#" ],
        properties  : true,
    },
    markdown : {
        name       : "Markdown",
        extensions : [ "md", "markdown" ],
        plain      : true,
    },
};



/**
 * Says which language the file is written in, from its name when it has
 * one, and from a look at the text otherwise. Nothing is said of a text
 * that reads as none of them
 * @param {String}  name
 * @param {String}  text
 * @param {Boolean} isJson
 * @returns {String}
 */
export function detectLanguage(name, text, isJson) {
    const match = name.match(/\.([a-z0-9]+)$/i);
    if (match) {
        const extension = match[1].toLowerCase();
        for (const [ id, language ] of Object.entries(LANGUAGES)) {
            if (language.extensions.includes(extension)) {
                return id;
            }
        }
    }
    if (isJson) {
        return "json";
    }

    const head = text.slice(0, 4000);
    if (/^\s*<\?php/.test(head)) {
        return "php";
    }
    if (/^\s*<(!doctype|html|\?xml|svg|[a-z][\w-]*(\s|>))/i.test(head)) {
        return "html";
    }
    if (/^#!.*\b(ba|z|fi)?sh\b/.test(head)) {
        return "shell";
    }
    if (/^#!.*python|^\s*(def |class \w+(\(.*\))?:|import \w+$|from \S+ import )/m.test(head)) {
        return "python";
    }
    if (/^\s*(select|insert into|create table|alter table|update|delete from)\b/im.test(head)) {
        return "sql";
    }
    if (/\{\s*\n(\s*[a-z-]+\s*:\s*[^;\n]+;\s*\n)+/.test(head)) {
        return "css";
    }
    if (/\b(function|const|let|var|=>|import .* from|export |console\.)/.test(head)) {
        return "javascript";
    }
    return "";
}

/**
 * Returns what the language is called, or nothing for one that is not known
 * @param {String} id
 * @returns {String}
 */
export function languageName(id) {
    return LANGUAGES[id] ? LANGUAGES[id].name : "";
}



/**
 * Colors the lines the way the language is written: returns the tokens of
 * each line, as where each starts and ends and what it is. A comment or a
 * string that runs past a line goes on into the next
 * @param {String[]} lines
 * @param {String}   id
 * @returns {Object[][]}
 */
export function tokenize(lines, id) {
    const language = LANGUAGES[id];
    if (!language || language.plain) {
        return lines.map(() => []);
    }

    const state = { block : null, inTag : false };
    return lines.map((line) => (language.markup
        ? scanMarkup(line, state)
        : scanCode(line, language, state)));
}

/**
 * Reads the tokens of a line of code
 * @param {String} line
 * @param {Object} language
 * @param {Object} state
 * @returns {Object[]}
 */
function scanCode(line, language, state) {
    const tokens = [];
    const total  = line.length;
    const push   = (start, end, type) => {
        if (end > start && type) {
            tokens.push({ start, end, type });
        }
    };
    let i = 0;

    while (i < total) {
        if (state.block) {
            i = scanBlock(line, i, state, push);
            continue;
        }

        const char = line[i];
        if (char === " " || char === "\t") {
            i += 1;
            continue;
        }

        if (language.blockComment && line.startsWith(language.blockComment[0], i)) {
            state.block = { end : language.blockComment[1], type : "comment", from : i + language.blockComment[0].length };
            continue;
        }
        if (language.lineComment && language.lineComment.some((start) => line.startsWith(start, i))) {
            push(i, total, "comment");
            return tokens;
        }

        // A string that does not close on its line runs to the end of it,
        // and on into the next lines when the language lets it
        const quote = language.strings.find((one) => line.startsWith(one, i));
        if (quote) {
            const close = findClose(line, i + quote.length, quote);
            if (close < 0) {
                push(i, total, "string");
                if (language.multiline && language.multiline.includes(quote)) {
                    state.block = { end : quote, type : "string", from : 0 };
                }
                return tokens;
            }
            const end  = close + quote.length;
            const type = language.keyStrings && /^\s*:/.test(line.slice(end)) ? "property" : "string";
            push(i, end, type);
            i = end;
            continue;
        }

        if (language.variables && char === "$") {
            const length = matchAt(/\$\{?[A-Za-z_]\w*\}?/y, line, i);
            if (length) {
                push(i, i + length, "variable");
                i += length;
                continue;
            }
        }
        if (language.atRules && char === "@") {
            const length = matchAt(/@[A-Za-z-]+/y, line, i);
            if (length) {
                push(i, i + length, "keyword");
                i += length;
                continue;
            }
        }
        if (language.colors && char === "#") {
            const length = matchAt(/#[0-9a-fA-F]{3,8}\b/y, line, i);
            if (length) {
                push(i, i + length, "number");
                i += length;
                continue;
            }
        }

        if (/[0-9]/.test(char) || (char === "." && /[0-9]/.test(line[i + 1] || ""))) {
            const pattern = language.units
                ? /(0[xX][0-9a-fA-F_]+|\.?\d[\d_]*(\.\d+)?([eE][+-]?\d+)?)[a-zA-Z%]*/y
                : /(0[xX][0-9a-fA-F_]+|\.?\d[\d_]*(\.\d+)?([eE][+-]?\d+)?)/y;
            const length = matchAt(pattern, line, i);
            if (length) {
                push(i, i + length, "number");
                i += length;
                continue;
            }
        }

        if (/[A-Za-z_]/.test(char)) {
            const length = matchAt(language.properties ? /[A-Za-z_][\w-]*/y : /[A-Za-z_]\w*/y, line, i);
            const word   = line.slice(i, i + length);
            const rest   = line.slice(i + length);
            push(i, i + length, wordType(word, rest, language));
            i += length;
            continue;
        }

        i += 1;
    }
    return tokens;
}

/**
 * Says what a word is: one the language keeps, a constant, the name of a
 * property when a colon follows it, or a function when a bracket does
 * @param {String} word
 * @param {String} rest
 * @param {Object} language
 * @returns {String}
 */
function wordType(word, rest, language) {
    const key = language.caseless ? word.toLowerCase() : word;
    if (language.keywords.includes(key)) {
        return "keyword";
    }
    if (language.constants.includes(word)) {
        return "constant";
    }
    // In CSS a selector is followed by a colon too, as a:hover is, and what
    // tells the two apart is the block that opens after the selector
    if (language.properties && /^\s*:/.test(rest) && !rest.includes("{")) {
        return "property";
    }
    if (language.functions && /^\s*\(/.test(rest)) {
        return "function";
    }
    return "";
}

/**
 * Reads the tokens of a line of markup, which is text with tags in it
 * @param {String} line
 * @param {Object} state
 * @returns {Object[]}
 */
function scanMarkup(line, state) {
    const tokens = [];
    const total  = line.length;
    const push   = (start, end, type) => {
        if (end > start && type) {
            tokens.push({ start, end, type });
        }
    };
    let i = 0;

    while (i < total) {
        if (state.block) {
            i = scanBlock(line, i, state, push);
            continue;
        }

        const char = line[i];
        if (state.inTag) {
            if (char === " " || char === "\t") {
                i += 1;
            } else if (char === "\"" || char === "'") {
                const close = findClose(line, i + 1, char);
                const end   = close < 0 ? total : close + 1;
                push(i, end, "string");
                i = end;
            } else if (line.startsWith("/>", i)) {
                push(i, i + 2, "tag");
                state.inTag = false;
                i += 2;
            } else if (char === ">") {
                push(i, i + 1, "tag");
                state.inTag = false;
                i += 1;
            } else {
                const length = matchAt(/[A-Za-z_:@][\w:.-]*/y, line, i);
                if (length) {
                    push(i, i + length, "attribute");
                    i += length;
                } else {
                    i += 1;
                }
            }
            continue;
        }

        if (line.startsWith("<!--", i)) {
            state.block = { end : "-->", type : "comment", from : i + 4 };
            continue;
        }
        if (char === "<") {
            const length = matchAt(/<\/?[A-Za-z][\w:.-]*/y, line, i) || matchAt(/<[!?][\w:.-]*/y, line, i);
            if (length) {
                push(i, i + length, "tag");
                state.inTag = true;
                i += length;
                continue;
            }
        }
        i += 1;
    }
    return tokens;
}

/**
 * Reads on to the end of a comment or a string that started on a line
 * before, or takes the whole line when it does not end on this one, and
 * returns where to go on from
 * @param {String}   line
 * @param {Number}   from
 * @param {Object}   state
 * @param {Function} push
 * @returns {Number}
 */
function scanBlock(line, from, state, push) {
    // The search starts past what opened the block, or the opening of a
    // comment would read as its closing
    const at = line.indexOf(state.block.end, Math.max(from, state.block.from));
    if (at < 0) {
        push(from, line.length, state.block.type);
        state.block.from = 0;
        return line.length;
    }
    const end = at + state.block.end.length;
    push(from, end, state.block.type);
    state.block = null;
    return end;
}

/**
 * Returns where the quote closes, skipping the ones that are escaped, or a
 * negative number when it does not on this line
 * @param {String} line
 * @param {Number} from
 * @param {String} quote
 * @returns {Number}
 */
function findClose(line, from, quote) {
    let i = from;
    while (i < line.length) {
        if (line[i] === "\\") {
            i += 2;
            continue;
        }
        if (line.startsWith(quote, i)) {
            return i;
        }
        i += 1;
    }
    return -1;
}

/**
 * Returns how long the match of the pattern at the given place is, or zero
 * @param {RegExp} pattern
 * @param {String} line
 * @param {Number} at
 * @returns {Number}
 */
function matchAt(pattern, line, at) {
    pattern.lastIndex = at;
    const match = pattern.exec(line);
    return match ? match[0].length : 0;
}
