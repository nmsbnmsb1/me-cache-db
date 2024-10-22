"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListSet = exports.List = void 0;
const fields_1 = require("./core/fields");
const cache_1 = require("./core/cache");
const cdata_1 = require("./core/cdata");
const trigger_1 = require("./trigger");
class List {
    constructor(cacheConfig, dds, selector, transform) {
        if (cacheConfig) {
            this.cid = cacheConfig.cid;
            this.cache = cache_1.CacheManager.getCache(this.cid);
            this.listKey = this.cache.getKey('list', cacheConfig.listKey.ns, cacheConfig.listKey.nn);
            this.expireMS = cacheConfig.expireMS || cache_1.CacheManager.defaultExpireMS;
        }
        this.dds = dds;
        this.selector = selector;
        this.transform = transform;
    }
    async sel(fields, page, pageSize, order = 'ASC', raw, forceDB) {
        let listdds = [];
        for (let i = 0; i < this.dds.length; i++) {
            listdds.push({ ...this.dds[i], ...(fields ? fields[i] : undefined) });
        }
        if (!this.cache) {
            let dbDatas = await this.selector(listdds, page, pageSize, order);
            return {
                count: dbDatas.count,
                page,
                pageSize,
                totalPages: pageSize <= 0 ? 1 : Math.ceil(dbDatas.count / pageSize),
                datas: dbDatas.datas,
            };
        }
        let keyPrefix = `${pageSize}.${order}`;
        let countKey = `${keyPrefix}.count`;
        let pageDataKey = `${keyPrefix}.P${page}`;
        if (!forceDB) {
            let count = 0;
            let datas;
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
                    datas = await (0, cdata_1.cgetData)(this.cid, datas, listdds, raw === false ? this.transform : undefined);
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
        let dbDatas = await this.selector(listdds, page, pageSize, order);
        {
            let pl = this.cache.pipeline();
            pl.set(this.listKey, countKey, dbDatas.count);
            let context;
            if (dbDatas.count <= 0) {
                pl.set(this.listKey, pageDataKey, `[]`);
            }
            else {
                context = { data: dbDatas.datas };
                let dataRefs = [];
                for (let i = 0; i < dbDatas.datas.length; i++) {
                    let dref = {};
                    let data = dbDatas.datas[i];
                    let transform = raw === false ? this.transform : undefined;
                    (0, cdata_1.cset)(pl, context, i, data, listdds, transform, dref, this.expireMS);
                    dataRefs.push(dref);
                }
                pl.set(this.listKey, pageDataKey, dataRefs);
            }
            pl.expire(this.listKey, this.expireMS);
            await pl.exec();
            if (context === null || context === void 0 ? void 0 : context.ps)
                await Promise.all(context.ps);
        }
        return {
            count: dbDatas.count,
            page,
            pageSize,
            totalPages: pageSize <= 0 ? 1 : Math.ceil(dbDatas.count / pageSize),
            datas: dbDatas.datas,
        };
    }
    async del(delDatas) {
        if (!this.cache)
            return;
        if (!delDatas)
            return this.cache.del(this.listKey);
        let pl = this.cache.pipeline();
        let data = await this.cache.get(this.listKey);
        if (data) {
            let dds = [];
            for (let dd of this.dds) {
                dds.push({ ns: dd.ns, nn: dd.nn, dataPkField: !dd.as ? dd.pkfield : (0, fields_1.attachAs)(dd.as, dd.pkfield) });
            }
            for (let key in data) {
                let drefs = data[key];
                if (!Array.isArray(drefs))
                    continue;
                for (let dref of drefs) {
                    for (let dd of dds) {
                        pl.del(this.cache.getKey('data', dd.ns, dd.nn || dref[dd.dataPkField]));
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
    async sel(listConfig, fields, page, pageSize, order = 'ASC', raw, forceDB) {
        let id = `${listConfig.ns}:${listConfig.nn}`;
        let list = this.listMap[id] || (this.listMap[id] = this.factory(listConfig));
        return list.sel(fields, page, pageSize, order, raw, forceDB);
    }
    async del(key, delDatas = false, onDataRefsNotFound) {
        let id = `${key.ns}:${key.nn}`;
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
            let id = `${key.ns}:${key.nn}`;
            let list = this.listMap[id];
            if (list) {
                list.del(false);
            }
            else {
                if (!cache)
                    cache = cache_1.CacheManager.getCache();
                await cache.del(cache.getKey('list', key.ns, key.nn));
            }
        }
    }
}
exports.ListSet = ListSet;
//# sourceMappingURL=list.js.map