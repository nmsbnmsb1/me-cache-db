"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.del = exports.update = exports.selIn = exports.sel = void 0;
const cache_1 = require("./core/cache");
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
async function selIn(cid, pkfield, pkvalues, sd, selector, forceDB, expireMS) {
    let datas = [];
    for (let v of pkvalues)
        datas.push({ [pkfield]: v });
    return sel(cid, datas, [sd], selector, forceDB, expireMS);
}
exports.selIn = selIn;
async function update(cid, data, sd, updater, expireMS) {
    try {
        await updater(data);
    }
    catch (e) {
        throw e;
    }
    await (0, cdata_1.csetData)(cid, data, [sd], expireMS);
}
exports.update = update;
async function del(cid, data, key, deleter) {
    try {
        await deleter(data);
    }
    catch (e) {
        throw e;
    }
    if (!Array.isArray(data)) {
        (0, cdata_1.cdel)(cid, { ...key, pk: data[key.pkfield] });
    }
    else {
        let cache = cache_1.CacheManager.getCache(cid);
        if (cache) {
            let pl = cache.pipeline();
            for (let d of data) {
                pl.del(cache.getKey('data', key.ns, d[key.pkfield]));
            }
            pl.exec();
        }
    }
}
exports.del = del;
//# sourceMappingURL=data.js.map