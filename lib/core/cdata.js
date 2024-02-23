"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cexpire = exports.cdelData = exports.cdel = exports.cexists = exports.csetData = exports.cset = exports.cgetData = exports.cget = void 0;
const fields_1 = require("./fields");
const cache_1 = require("./cache");
function handleData(dd) {
    dd.__handled = true;
    if (!dd.as) {
        if (dd.pkfield) {
            dd.dataPkField = dd.pkfield;
        }
    }
    else {
        dd.nas = {};
        if (dd.pkfield) {
            dd.dataPkField = dd.nas[dd.pkfield] = (0, fields_1.attachAs)(dd.as, dd.pkfield);
        }
    }
    if (dd.fields)
        dd.needFields = (0, fields_1.pickFields)(dd);
    if (dd.needFields)
        dd.dfieldMap = {};
    return dd;
}
function getPipeline(pl) {
    if (!pl) {
        return cache_1.CacheManager.pipeline(cache_1.CacheManager.defaultCID);
    }
    else if (typeof pl === 'string') {
        return cache_1.CacheManager.pipeline(pl);
    }
    else if (pl.pipeline) {
        return pl.pipeline();
    }
    return pl;
}
function cget(pl, context, index, data, dds, transform) {
    let readCount = 0;
    for (let dd of dds) {
        let hdd = dd;
        if (!hdd.__handled)
            handleData(hdd);
        let key = pl.getCache().getKey('data', hdd.ns, hdd.nn || data[hdd.dataPkField]);
        let { as, pkfield, needFields } = hdd;
        let { nas, dataPkField, dfieldMap } = hdd;
        pl.get(key, needFields, (err, values, valueConvetor) => {
            if (context.done === false)
                return;
            let readDone = undefined;
            if (err || !values)
                readDone = false;
            else {
                let fn = (field, value) => {
                    value = !valueConvetor ? value : valueConvetor(value);
                    if (value === undefined)
                        return false;
                    let dataField;
                    if (!nas) {
                        dataField = field;
                    }
                    else {
                        dataField = nas[field] || (nas[field] = (0, fields_1.attachAs)(as, field));
                    }
                    return (data[dataField] = value);
                };
                if (Array.isArray(values)) {
                    for (let k = 0; k < needFields.length; k++) {
                        if (!fn(needFields[k], values[k])) {
                            readDone = false;
                            break;
                        }
                    }
                }
                else {
                    for (let f in values) {
                        if (!fn(f, values[f])) {
                            readDone = false;
                            break;
                        }
                    }
                }
            }
            if (readDone === false) {
                context.done = false;
                return;
            }
            if (pkfield && needFields && dfieldMap[pkfield] !== false) {
                if (dfieldMap[pkfield]) {
                    delete data[dataPkField];
                }
                else if (needFields.indexOf(pkfield) < 0) {
                    dfieldMap[pkfield] = true;
                    delete data[dataPkField];
                }
                else {
                    dfieldMap[pkfield] = false;
                }
            }
            readCount++;
            if (readCount >= dds.length) {
                let ndata = !transform ? data : transform(data);
                if (!ndata.then) {
                    index === undefined ? (context.data = ndata) : (context.data[index] = ndata);
                }
                else {
                    (context.ps || (context.ps = [])).push(ndata.then((ndata) => (index === undefined ? (context.data = ndata) : (context.data[index] = ndata))));
                }
            }
        });
    }
}
exports.cget = cget;
async function cgetData(cid, data, dds, transform) {
    let pl = getPipeline(cid);
    if (!pl)
        return;
    let context = { data };
    if (!Array.isArray(data)) {
        cget(pl, context, undefined, data, dds, transform);
    }
    else {
        for (let i = 0; i < data.length; i++) {
            cget(pl, context, i, data[i], dds, transform);
        }
    }
    await pl.exec();
    if (context.ps) {
        await Promise.all(context.ps);
    }
    return context.done !== false ? context.data : undefined;
}
exports.cgetData = cgetData;
async function cset(pl, context, index, data, dds, transform, dataRefs, expireMS) {
    for (let dd of dds) {
        let hdd = dd;
        if (!hdd.__handled)
            handleData(hdd);
        if (dds.length > 1 && !hdd.nas)
            throw new Error('should set `as` when data has more than one DataDescriptor');
        let key = pl.getCache().getKey('data', hdd.ns, hdd.nn || data[hdd.dataPkField]);
        let { as, needFields } = hdd;
        let { nas, dataPkField, dfieldMap } = hdd;
        if (dataRefs)
            dataRefs[dataPkField] = data[dataPkField];
        for (let dataField in data) {
            let field;
            {
                if (!nas) {
                    field = dataField;
                }
                else if (nas[dataField] === false) {
                    continue;
                }
                else {
                    if (nas[dataField]) {
                        field = nas[dataField];
                    }
                    else if ((0, fields_1.hasAs)(as, dataField)) {
                        field = nas[dataField] = (0, fields_1.cutAs)(as, dataField);
                    }
                    else {
                        nas[dataField] = false;
                        continue;
                    }
                }
            }
            pl.set(key, field, data[dataField]);
            if (needFields && dfieldMap[dataField] !== false) {
                if (dfieldMap[dataField]) {
                    delete data[dataField];
                }
                else if (needFields.indexOf(field) < 0) {
                    dfieldMap[dataField] = true;
                    delete data[dataField];
                }
                else {
                    dfieldMap[dataField] = false;
                }
            }
        }
        pl.expire(key, expireMS || cache_1.CacheManager.defaultExpireMS);
    }
    let ndata = !transform ? data : transform(data);
    if (!ndata.then) {
        index === undefined ? (context.data = ndata) : (context.data[index] = ndata);
    }
    else {
        (context.ps || (context.ps = [])).push(ndata.then((ndata) => (index === undefined ? (context.data = ndata) : (context.data[index] = ndata))));
    }
}
exports.cset = cset;
async function csetData(cid, data, dds, transform, expireMS) {
    let pl = getPipeline(cid);
    if (!pl)
        return;
    let context = { data };
    if (!Array.isArray(data)) {
        cset(pl, context, undefined, data, dds, transform, undefined, expireMS);
        await pl.exec();
        if (context.ps)
            await Promise.all(context.ps);
    }
    else if (data.length > 0) {
        for (let i = 0; i < data.length; i++) {
            cset(pl, context, i, data[i], dds, transform, undefined, expireMS);
        }
        await pl.exec();
        if (context.ps)
            await Promise.all(context.ps);
    }
    return context.data;
}
exports.csetData = csetData;
async function cexists(cid, key) {
    let cache = cache_1.CacheManager.getCache(cid || cache_1.CacheManager.defaultCID);
    if (cache) {
        if (typeof key === 'string') {
            return cache.exists(key);
        }
        else {
            return cache.exists(cache.getKey(key.prefix || 'data', key.ns, key.nn));
        }
    }
    return false;
}
exports.cexists = cexists;
async function cdel(cid, key) {
    let cache = cache_1.CacheManager.getCache(cid || cache_1.CacheManager.defaultCID);
    if (cache) {
        if (typeof key === 'string') {
            return cache.del(key);
        }
        else {
            return cache.del(cache.getKey(key.prefix || 'data', key.ns, key.nn));
        }
    }
}
exports.cdel = cdel;
async function cdelData(cid, key, datas) {
    let pl = getPipeline(cid);
    if (!pl)
        return;
    let { prefix, ns, nn, pkfield } = key;
    for (let d of datas) {
        pl.del(pl.getCache().getKey(prefix || 'data', ns, nn || d[pkfield]));
    }
    return pl.exec();
}
exports.cdelData = cdelData;
async function cexpire(cid, key, ms) {
    let cache = cache_1.CacheManager.getCache(cid || cache_1.CacheManager.defaultCID);
    if (cache) {
        if (typeof key === 'string') {
            return cache.expire(key, ms);
        }
        else {
            return cache.expire(cache.getKey(key.prefix || 'data', key.ns, key.nn), ms);
        }
    }
}
exports.cexpire = cexpire;
//# sourceMappingURL=cdata.js.map