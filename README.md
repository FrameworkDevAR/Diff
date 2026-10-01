# Diff

A diff of two files, drawn in the browser: paste or drop the old one and the new
one, and see what changed side by side or in one column, with the words that
changed marked inside each line. Two JSON files are also compared by what they
hold, key by key, whatever order they were written in. Everything stays in the
browser, and comes back the way you left it.

**[Open Diff →](https://diff.frameworkphp.com.ar/)**

## Links

A link can carry the two files after its `#`, so opening it shows the diff
right away. Nothing after the `#` is sent anywhere. Short files can be written
out, percent-encoded:

```
https://diff.frameworkphp.com.ar/#old=<text>&new=<text>
```

Longer ones are packed, as a JSON object that is gzipped and written in base64:

```
https://diff.frameworkphp.com.ar/#z=<base64 of the gzip of the JSON>
```

The fields are `old`, `new`, and the optional `oldName`, `newName` and `layout`
(`split`, `unified` or `tree`). [llms.txt](llms.txt) tells an LLM how to write
one.

Once a diff is compared it is kept in the history, and the address becomes that
of its place there, as `#h=<number>`, so the browser goes back and forward
through the diffs. That address only means something in the browser that holds
the history.
