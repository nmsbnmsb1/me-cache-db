"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListSet = exports.List = void 0;
const cdata_1 = require("./core/cdata");
const cache_1 = require("./core/cache");
const trigger_1 = require("./trigger");
const fields_1 = require("./core/fields");
class List {
    constructor(cid, key, sds, selector, expireMS) {
        this.cid = cid;
        this.cache = cache_1.CacheManager.getCache(this.cid);
        this.key = key;
        this.listKey = this.cache.getKey('list', key.ns, key.listName);
        this.sds = sds;
        this.selector = selector;
        this.expireMS = expireMS || cache_1.CacheManager.defaultExpireMS;
    }
    async sel(page, pageSize, order = 'ASC', fields, forceDB) {
        let keyPrefix = `${pageSize}.${order}`;
        let countKey = `${keyPrefix}.count`;
        let pageDataKey = `${keyPrefix}.P${page}`;
        let sds = [];
        for (let i = 0; i < this.sds.length; i++) {
            sds.push({ ...this.sds[i], ...(fields ? fields[i] : undefined) });
        }
        let count = 0;
        let dataRefs;
        if (!forceDB) {
            let lcdata = await this.cache.get(this.listKey, [countKey, pageDataKey]);
            if (lcdata) {
                if (lcdata[countKey] !== null && lcdata[countKey] !== undefined) {
                    count = lcdata[countKey];
                    if (count === 0) {
                        return { count: 0, page, pageSize, totalPages: 0, datas: [] };
                    }
                }
                if (lcdata[pageDataKey]) {
                    dataRefs = JSON.parse(lcdata[pageDataKey]);
                }
                if (count && dataRefs) {
                    let datas = await (0, cdata_1.cgetData)(this.cid, dataRefs, sds);
                    if (datas) {
                        return {
                            count,
                            page,
                            pageSize,
                            totalPages: pageSize <= 0 ? 1 : Math.ceil(count / pageSize),
                            datas: datas,
                        };
                    }
                }
            }
        }
        let data = await this.selector(page, pageSize, order, sds);
        let pl = this.cache.pipeline();
        pl.set(this.listKey, countKey, data.count);
        if (data.count > 0) {
            dataRefs = [];
            for (let i = 0; i < data.datas.length; i++) {
                let dataRef = {};
                (0, cdata_1.cset)(pl, data.datas[i], sds, this.expireMS, dataRef);
                dataRefs.push(dataRef);
            }
            pl.set(this.listKey, pageDataKey, JSON.stringify(dataRefs));
        }
        else {
            pl.set(this.listKey, pageDataKey, `[]`);
        }
        pl.expire(this.listKey, this.expireMS);
        pl.exec();
        return {
            count: data.count,
            page,
            pageSize,
            totalPages: pageSize <= 0 ? 1 : Math.ceil(data.count / pageSize),
            datas: data.datas,
        };
    }
    async del(delDatas) {
        if (!delDatas) {
            return this.cache.del(this.listKey);
        }
        let pl = this.cache.pipeline();
        let data = await this.cache.get(this.listKey);
        if (data) {
            let sds = [];
            for (let sd of this.sds) {
                sds.push({ ns: sd.ns, dataPkField: !sd.as ? sd.pkfield : (0, fields_1.attachAs)(sd.as, sd.pkfield) });
            }
            for (let key in data) {
                let val = data[key];
                if (!(typeof val === 'string' && val.startsWith('[{')))
                    continue;
                let dataRefs = JSON.parse(val);
                for (let dataRef of dataRefs) {
                    for (let sd of sds) {
                        pl.del(this.cache.getKey('data', sd.ns, dataRef[sd.dataPkField]));
                    }
                }
            }
        }
        pl.del(this.listKey);
        return pl.exec();
    }
}
exports.List = List;
class ListSet {
    constructor(listFactory) {
        this.factory = listFactory;
        this.listMap = {};
    }
    async sel(where, page, pageSize = 0, order = 'ASC', fields, forceDB) {
        let id = `${where.ns}:${where.listName}`;
        let list = this.listMap[id] || (this.listMap[id] = this.factory(where));
        return list.sel(page, pageSize, order, fields, forceDB);
    }
    async del(key, delDatas = false, onDataRefsNotFound) {
        let id = `${key.ns}:${key.listName}`;
        let list = this.listMap[id];
        return !list ? undefined : list.del(delDatas, onDataRefsNotFound);
    }
    setTrigger(names) {
        let ln = (body) => this.onTrigger(body);
        if (typeof names === 'string') {
            trigger_1.Trigger.set(names, ln);
        }
        else {
            for (let n of names) {
                trigger_1.Trigger.set(n, ln);
            }
        }
        return this;
    }
    async onTrigger(key) {
        let id = `${key.ns}:${key.listName}`;
        let list = this.listMap[id];
        if (list) {
            list.del(false);
        }
        else {
            let cache = cache_1.CacheManager.getCache();
            if (cache) {
                await cache.del(cache.getKey('list', key.ns, key.listName));
            }
        }
    }
}
exports.ListSet = ListSet;
//# sourceMappingURL=list.js.map