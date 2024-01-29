"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListSet = exports.List = void 0;
const cdata_1 = require("./core/cdata");
const cache_1 = require("./core/cache");
const trigger_1 = require("./trigger");
const fields_1 = require("./core/fields");
class List {
    constructor(cid, key, sds, selector, transform, expireMS) {
        this.cid = cid;
        this.cache = cache_1.CacheManager.getCache(this.cid);
        this.key = key;
        this.listKey = this.cache.getKey('list', key.ns, key.listName);
        this.sds = sds;
        this.selector = selector;
        this.transform = transform;
        this.expireMS = expireMS || cache_1.CacheManager.defaultExpireMS;
    }
    async sel(page, pageSize, order = 'ASC', fields, raw, forceDB) {
        let keyPrefix = `${pageSize}.${order}`;
        let countKey = `${keyPrefix}.count`;
        let pageDataKey = `${keyPrefix}.P${page}`;
        let count = 0;
        let datas;
        let sds = [];
        for (let i = 0; i < this.sds.length; i++) {
            sds.push({ ...this.sds[i], ...(fields ? fields[i] : undefined) });
        }
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
                    datas = lcdata[pageDataKey];
                }
                if (count && datas) {
                    datas = await (0, cdata_1.cgetData)(this.cid, datas, sds, raw === false ? this.transform : undefined);
                    if (datas) {
                        return {
                            count,
                            page,
                            pageSize,
                            totalPages: pageSize <= 0 ? 1 : Math.ceil(count / pageSize),
                            datas: datas,
                        };
                    }
                    datas = undefined;
                }
            }
        }
        let pageData = await this.selector(page, pageSize, order, sds);
        let pl = this.cache.pipeline();
        pl.set(this.listKey, countKey, pageData.count);
        let context;
        if (pageData.count <= 0) {
            pl.set(this.listKey, pageDataKey, `[]`);
        }
        else {
            context = { data: pageData.datas };
            let dataRefs = [];
            for (let i = 0; i < pageData.datas.length; i++) {
                let dref = {};
                (0, cdata_1.cset)(pl, context, i, pageData.datas[i], sds, raw === false ? this.transform : undefined, dref, this.expireMS);
                dataRefs.push(dref);
            }
            pl.set(this.listKey, pageDataKey, dataRefs);
        }
        pl.expire(this.listKey, this.expireMS);
        await pl.exec();
        if (context === null || context === void 0 ? void 0 : context.ps) {
            await Promise.all(context.ps);
        }
        return {
            count: pageData.count,
            page,
            pageSize,
            totalPages: pageSize <= 0 ? 1 : Math.ceil(pageData.count / pageSize),
            datas: pageData.datas,
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
                if (!Array.isArray(val))
                    continue;
                for (let data of val) {
                    for (let sd of sds) {
                        pl.del(this.cache.getKey('data', sd.ns, data[sd.dataPkField]));
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
    async sel(where, page, pageSize = 0, order = 'ASC', fields, raw, forceDB) {
        let id = `${where.ns}:${where.listName}`;
        let list = this.listMap[id] || (this.listMap[id] = this.factory(where));
        return list.sel(page, pageSize, order, fields, raw, forceDB);
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
    async onTrigger(keys) {
        if (!Array.isArray(keys))
            keys = [keys];
        let cache;
        for (let key of keys) {
            let id = `${key.ns}:${key.listName}`;
            let list = this.listMap[id];
            if (list) {
                list.del(false);
            }
            else {
                if (!cache)
                    cache = cache_1.CacheManager.getCache();
                await cache.del(cache.getKey('list', key.ns, key.listName));
            }
        }
    }
}
exports.ListSet = ListSet;
//# sourceMappingURL=list.js.map