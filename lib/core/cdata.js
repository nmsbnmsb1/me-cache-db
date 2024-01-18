"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cexpire = exports.cdel = exports.cexists = exports.csetData = exports.cset = exports.cgetData = exports.cget = exports.Transformer = exports.metadataField = void 0;
const fields_1 = require("./fields");
const cache_1 = require("./cache");
exports.metadataField = '$metadata';
exports.Transformer = {
    transform: undefined,
};
function handleStructDescriptor(sd, transform) {
    sd.__handled = true;
    if (!sd.as) {
        sd.dataPkField = sd.pkfield;
    }
    else {
        sd.nas = {};
        sd.dataPkField = sd.nas[sd.pkfield] = (0, fields_1.attachAs)(sd.as, sd.pkfield);
    }
    if (sd.fields)
        sd.needFields = (0, fields_1.pickFields)(sd);
    if (sd.needFields)
        sd.dfieldMap = {};
    if (sd.needFields) {
        sd.allwantFields = !transform ? sd.needFields : sd.needFields.concat(exports.metadataField);
    }
    return sd;
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
function cget(pl, context, index, data, sds, transform = false) {
    let readCount = 0;
    let metadatas = !transform ? undefined : {};
    for (let sd of sds) {
        let hsd = sd;
        if (!hsd.__handled) {
            handleStructDescriptor(hsd, !!transform);
        }
        let key = pl.getCache().getKey('data', hsd.ns, data[hsd.dataPkField]);
        let { as, pkfield, needFields } = hsd;
        let { nas, dataPkField, dfieldMap } = hsd;
        let { allwantFields } = hsd;
        pl.get(key, allwantFields, (err, values, valueConvetor) => {
            if (context.done === false) {
                return;
            }
            let readDone = undefined;
            if (err || !values) {
                readDone = false;
            }
            else {
                let fn = (field, value) => {
                    value = !valueConvetor ? value : valueConvetor(value);
                    if (value === undefined && field !== exports.metadataField) {
                        return false;
                    }
                    let dataField;
                    if (!nas) {
                        dataField = field;
                    }
                    else {
                        dataField = nas[field] || (nas[field] = (0, fields_1.attachAs)(as, field));
                    }
                    if (field === exports.metadataField) {
                        if (metadatas)
                            metadatas[dataField] = value;
                    }
                    else {
                        data[dataField] = value;
                    }
                    return true;
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
            if (needFields && dfieldMap[pkfield] !== false) {
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
            if (readCount >= sds.length) {
                let ndata = !transform ? data : (transform === true ? exports.Transformer.transform : transform)(data, metadatas);
                if (!ndata.then) {
                    context.data = index === undefined ? ndata : (context.data[index] = ndata);
                }
                else {
                    (context.ps || (context.ps = [])).push(ndata.then((ndata) => (context.data = index === undefined ? ndata : (context.data[index] = ndata))));
                }
            }
        });
    }
}
exports.cget = cget;
async function cgetData(cid, data, sds, transform = false) {
    let pl = getPipeline(cid);
    if (!pl)
        return;
    let context = { data };
    if (!Array.isArray(data)) {
        cget(pl, context, undefined, data, sds, transform);
    }
    else {
        for (let i = 0; i < data.length; i++) {
            cget(pl, context, i, data[i], sds, transform);
        }
    }
    await pl.exec();
    if (context.ps) {
        await Promise.all(context.ps);
    }
    return context.done !== false ? context.data : undefined;
}
exports.cgetData = cgetData;
async function cset(pl, context, index, data, sds, transform = false, dataRefs, expireMS) {
    let metadatas = !transform ? undefined : {};
    for (let sd of sds) {
        let hsd = sd;
        if (!hsd.__handled) {
            handleStructDescriptor(hsd, !!transform);
        }
        let key = pl.getCache().getKey('data', hsd.ns, data[hsd.dataPkField]);
        let { as, needFields } = hsd;
        let { nas, dataPkField, dfieldMap } = hsd;
        if (dataRefs) {
            dataRefs[dataPkField] = data[dataPkField];
        }
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
            if (field === exports.metadataField) {
                metadatas[dataField] = data[dataField];
                delete data[dataField];
            }
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
    let ndata = !transform ? data : (transform === true ? exports.Transformer.transform : transform)(data, metadatas);
    if (!ndata.then) {
        context.data = index === undefined ? ndata : (context.data[index] = ndata);
    }
    else {
        (context.ps || (context.ps = [])).push(ndata.then((ndata) => (context.data = index === undefined ? ndata : (context.data[index] = ndata))));
    }
}
exports.cset = cset;
async function csetData(cid, data, sds, transform = false, expireMS) {
    let pl = getPipeline(cid);
    if (!pl)
        return;
    let context = { data };
    if (!Array.isArray(data)) {
        cset(pl, context, undefined, data, sds, transform, undefined, expireMS);
    }
    else if (data.length > 0) {
        for (let i = 0; i < data.length; i++) {
            cset(pl, context, i, data[i], sds, transform, undefined, expireMS);
        }
    }
    await pl.exec();
    if (context.ps) {
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
            return cache.exists(cache.getKey(key.prefix || 'data', key.ns, key.pk));
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
            return cache.del(cache.getKey(key.prefix || 'data', key.ns, key.pk));
        }
    }
}
exports.cdel = cdel;
async function cexpire(cid, key, ms) {
    let cache = cache_1.CacheManager.getCache(cid || cache_1.CacheManager.defaultCID);
    if (cache) {
        if (typeof key === 'string') {
            cache.expire(key, ms);
        }
        else {
            return cache.expire(cache.getKey(key.prefix || 'data', key.ns, key.pk), ms);
        }
    }
}
exports.cexpire = cexpire;
//# sourceMappingURL=cdata.js.map