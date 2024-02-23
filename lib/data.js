"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.del = exports.update = exports.selIn = exports.sel = void 0;
const cache_1 = require("./core/cache");
const cdata_1 = require("./core/cdata");
async function sel(cid, data, dds, selector, transform, forceDB, expireMS) {
    let ndata;
    if (!forceDB) {
        ndata = await (0, cdata_1.cgetData)(cid, data, dds, transform);
    }
    if (!ndata) {
        ndata = await selector();
        if (ndata && (!Array.isArray(ndata) || ndata.length > 0)) {
            ndata = await (0, cdata_1.csetData)(cid, ndata, dds, transform, expireMS);
        }
    }
    return ndata;
}
exports.sel = sel;
async function selIn(cid, pkfield, pkvalues, dd, selector, transform, forceDB, expireMS) {
    let datas = [];
    for (let v of pkvalues) {
        datas.push({ [pkfield]: v });
    }
    return sel(cid, datas, [dd], selector, transform, forceDB, expireMS);
}
exports.selIn = selIn;
async function update(cid, data, dd, updater, handleCache = 'del', expireMS) {
    try {
        await updater(data);
    }
    catch (e) {
        throw e;
    }
    let cache = cache_1.CacheManager.getCache(cid);
    if (!cache)
        return;
    if (handleCache === 'update') {
        let context = { data };
        let dds = [dd];
        let pl;
        if (!Array.isArray(data)) {
            if (await cache.exists(cache.getKey('data', dd.ns, dd.nn || data[dd.pkfield]))) {
                if (!pl)
                    pl = cache.pipeline();
                (0, cdata_1.cset)(pl, context, undefined, data, dds, undefined, undefined, expireMS);
            }
        }
        else {
            for (let i = 0; i < data.length; i++) {
                if (await cache.exists(cache.getKey('data', dd.ns, dd.nn || data[i][dd.pkfield]))) {
                    if (!pl)
                        pl = cache.pipeline();
                    (0, cdata_1.cset)(pl, context, i, data[i], dds, undefined, undefined, expireMS);
                }
            }
        }
        if (pl)
            pl.exec();
    }
    else {
        if (!Array.isArray(data)) {
            (0, cdata_1.cdel)(cid, { prefix: 'data', ns: dd.ns, nn: dd.nn || data[dd.pkfield] });
        }
        else {
            let pl = cache.pipeline();
            for (let d of data) {
                pl.del(cache.getKey('data', dd.ns, dd.nn || d[dd.pkfield]));
            }
            pl.exec();
        }
    }
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
        (0, cdata_1.cdel)(cid, { ...key, nn: key.nn || data[key.pkfield] });
    }
    else {
        let cache = cache_1.CacheManager.getCache(cid);
        if (cache) {
            let pl = cache.pipeline();
            for (let d of data) {
                pl.del(cache.getKey('data', key.ns, key.nn || d[key.pkfield]));
            }
            pl.exec();
        }
    }
}
exports.del = del;
//# sourceMappingURL=data.js.map