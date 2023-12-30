"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cexpire = exports.cdel = exports.cexists = exports.csetData = exports.cset = exports.cgetData = exports.cget = exports.handleStructDescriptor = void 0;
const fields_1 = require("./fields");
const cache_1 = require("./cache");
function handleStructDescriptor(sd) {
    sd.__handled = true;
    if (!sd.as) {
        sd.dataPkField = sd.pkfield;
    }
    else {
        sd.nas = {};
        sd.dataPkField = sd.nas[sd.pkfield] = (0, fields_1.attachAs)(sd.as, sd.pkfield);
    }
    if (sd.fields)
        sd.neededFields = (0, fields_1.pickFields)(sd);
    if (sd.neededFields)
        sd.dfields = {};
    return sd;
}
exports.handleStructDescriptor = handleStructDescriptor;
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
function cget(pl, store, index, data, sds) {
    if (index === undefined) {
        store.data = data;
    }
    else {
        (store.data || (store.data = []))[index] = data;
    }
    for (let sd of sds) {
        let hsd = sd;
        if (!hsd.__handled) {
            handleStructDescriptor(hsd);
        }
        let key = pl.getCache().getKey('data', hsd.ns, data[hsd.dataPkField]);
        let { as, pkfield, neededFields } = hsd;
        let { nas, dataPkField, dfields } = hsd;
        pl.get(key, neededFields, (err, values, valueConvetor) => {
            if (!store.data)
                return;
            let done = true;
            if (err || !values)
                done = false;
            else {
                let fn = (field, value) => {
                    value = !valueConvetor ? value : valueConvetor(value);
                    if (value === undefined) {
                        return false;
                    }
                    let dataField;
                    if (!nas) {
                        dataField = field;
                    }
                    else {
                        dataField = nas[field] || (nas[field] = (0, fields_1.attachAs)(as, field));
                    }
                    data[dataField] = value;
                    return true;
                };
                if (Array.isArray(values)) {
                    for (let k = 0; k < neededFields.length; k++) {
                        if (!fn(neededFields[k], values[k])) {
                            done = false;
                            break;
                        }
                    }
                }
                else {
                    for (let f in values) {
                        if (!fn(f, values[f])) {
                            done = false;
                            break;
                        }
                    }
                }
            }
            if (!done) {
                delete store.data;
                return;
            }
            if (neededFields && dfields[pkfield] !== false) {
                if (dfields[pkfield]) {
                    delete data[dataPkField];
                }
                else if (neededFields.indexOf(pkfield) < 0) {
                    dfields[pkfield] = true;
                    delete data[dataPkField];
                }
                else {
                    dfields[pkfield] = false;
                }
            }
        });
    }
}
exports.cget = cget;
async function cgetData(cid, data, sds) {
    let pl = getPipeline(cid);
    if (!pl)
        return;
    let store = { data };
    if (!Array.isArray(data)) {
        cget(pl, store, undefined, data, sds);
    }
    else {
        for (let i = 0; i < data.length; i++) {
            cget(pl, store, i, data[i], sds);
        }
    }
    await pl.exec();
    return store.data;
}
exports.cgetData = cgetData;
function cset(pl, data, sds, expireMS, dataRefs) {
    for (let sd of sds) {
        let hsd = sd;
        if (!hsd.__handled) {
            handleStructDescriptor(hsd);
        }
        let key = pl.getCache().getKey('data', hsd.ns, data[hsd.dataPkField]);
        let { as, neededFields } = hsd;
        let { nas, dataPkField, dfields } = hsd;
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
            if (neededFields && dfields[dataField] !== false) {
                if (dfields[dataField]) {
                    delete data[dataField];
                }
                else if (neededFields.indexOf(field) < 0) {
                    dfields[dataField] = true;
                    delete data[dataField];
                }
                else {
                    dfields[dataField] = false;
                }
            }
        }
        pl.expire(key, expireMS || cache_1.CacheManager.defaultExpireMS);
    }
}
exports.cset = cset;
async function csetData(cid, data, sds, expireMS) {
    if (!Array.isArray(data)) {
        let pl = getPipeline(cid);
        if (pl) {
            cset(pl, data, sds, expireMS);
            await pl.exec();
        }
    }
    else if (data.length > 0) {
        let pl = getPipeline(cid);
        if (pl) {
            for (let d of data) {
                cset(pl, d, sds, expireMS);
            }
            await pl.exec();
        }
    }
    return data;
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