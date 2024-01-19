"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.del = exports.update = exports.selIn = exports.sel = void 0;
const cache_1 = require("./core/cache");
const cdata_1 = require("./core/cdata");
async function sel(cid, data, sds, selector, transform, forceDB, expireMS) {
    let ndata;
    if (!forceDB) {
        ndata = await (0, cdata_1.cgetData)(cid, data, sds, transform);
    }
    if (!ndata) {
        ndata = await selector();
        if (ndata) {
            ndata = await (0, cdata_1.csetData)(cid, ndata, sds, transform, expireMS);
        }
    }
    return ndata;
}
exports.sel = sel;
async function selIn(cid, pkfield, pkvalues, sd, selector, transform, forceDB, expireMS) {
    let datas = [];
    for (let v of pkvalues) {
        datas.push({ [pkfield]: v });
    }
    return sel(cid, datas, [sd], selector, transform, forceDB, expireMS);
}
exports.selIn = selIn;
async function update(cid, data, sd, updater, handleCache = 'del', expireMS) {
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
        let sds = [sd];
        let pl;
        if (!Array.isArray(data)) {
            if (await cache.exists(cache.getKey('data', sd.ns, data[sd.pkfield]))) {
                if (!pl)
                    pl = cache.pipeline();
                (0, cdata_1.cset)(pl, context, undefined, data, sds, undefined, undefined, expireMS);
            }
        }
        else {
            for (let i = 0; i < data.length; i++) {
                if (await cache.exists(cache.getKey('data', sd.ns, data[i][sd.pkfield]))) {
                    if (!pl)
                        pl = cache.pipeline();
                    (0, cdata_1.cset)(pl, context, i, data[i], sds, undefined, undefined, expireMS);
                }
            }
        }
        if (pl)
            pl.exec();
    }
    else {
        if (!Array.isArray(data)) {
            (0, cdata_1.cdel)(cid, { prefix: 'data', ns: sd.ns, pk: data[sd.pkfield] });
        }
        else {
            let pl = cache.pipeline();
            for (let d of data) {
                pl.del(cache.getKey('data', sd.ns, d[sd.pkfield]));
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