"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.del = exports.update = exports.sel = void 0;
const cdata_1 = require("./core/cdata");
async function sel(cid, data, sds, selector, forceDB, expireMS) {
    let ndata;
    if (!forceDB) {
        ndata = await (0, cdata_1.cgetData)(cid, data, sds);
    }
    if (!ndata) {
        ndata = await selector();
        if (ndata) {
            (0, cdata_1.csetData)(cid, ndata, sds, expireMS);
        }
    }
    return ndata;
}
exports.sel = sel;
async function update(cid, data, updater, keys) {
    let success = false;
    try {
        success = (await updater(data)) > 0;
    }
    catch (e) { }
    if (success) {
        for (let k of keys) {
            (0, cdata_1.cdel)(cid, { ...k, pk: k.pk || data[k.pkfield] });
        }
    }
    return success;
}
exports.update = update;
async function del(cid, data, deleter, keys) {
    let success = false;
    try {
        success = (await deleter(data)) > 0;
    }
    catch (e) { }
    if (success) {
        for (let k of keys) {
            (0, cdata_1.cdel)(cid, { ...k, pk: k.pk || data[k.pkfield] });
        }
    }
    return success;
}
exports.del = del;
//# sourceMappingURL=data.js.map