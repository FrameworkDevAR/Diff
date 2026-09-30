import Settings      from "./dialogs/Settings.js";
import HistoryDialog from "./dialogs/History.js";
import Saver         from "./dialogs/Saver.js";
import * as Keys     from "./actions/Keys.js";
import Inputs        from "./panel/Inputs.js";
import Result        from "./panel/Result.js";
import Header        from "./panel/Header.js";
import Bar           from "./panel/Bar.js";
import Compare       from "./core/Compare.js";
import Storage       from "./core/Storage.js";
import History       from "./core/History.js";
import Configs       from "./core/Configs.js";
import Mode          from "./core/Mode.js";
import Toast         from "./core/Toast.js";
import Tooltip       from "./core/Tooltip.js";



// The one of each the app is made of, which every action reaches for
export const storage       = new Storage();
export const history       = new History(storage);
export const configs       = new Configs(storage);
export const mode          = new Mode();
export const toast         = new Toast();
export const tooltip       = new Tooltip();
export const settings      = new Settings(configs, Keys.getShortcuts());
export const historyDialog = new HistoryDialog();
export const saver         = new Saver();
export const inputs        = new Inputs();
export const result        = new Result();
export const header        = new Header();
export const bar           = new Bar();

// The Compare being looked at, which changes as the files are compared again.
// It is exported as a binding rather than a value, so whoever imports it sees
// the new one
/** @type {?Compare} */
export let compare = null;



/**
 * Takes the given Compare as the one being looked at
 * @param {?Compare} value
 * @returns {Void}
 */
export function useCompare(value) {
    compare = value;
}
