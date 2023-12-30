"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListSet = exports.List = void 0;
const cdata_1 = require("./core/cdata");
const cache_1 = require("./core/cache");
const trigger_1 = require("./trigger");
function getListData(count, page, pageSize, datas) {
    return { count, page, pageSize, totalPages: pageSize <= 0 ? 1 : Math.ceil(count / pageSize), datas };
}
class List {
    constructor(cid, key, sds, selector, expireMS) {
        this.cid = cid;
        this.cache = cache_1.CacheManager.getCache(this.cid);
        this.key = key;
        this.listKey = this.cache.getKey('list', key.ns, key.listName);
        for (let sd of sds) {
            (0, cdata_1.handleStructDescriptor)(sd);
        }
        this.sds = sds;
        this.selector = selector;
        this.expireMS = expireMS || cache_1.CacheManager.defaultExpireMS;
    }
    async sel(page, pageSize, order = 'ASC') {
        let keyPrefix = `${pageSize}.${order}`;
        let countKey = `${keyPrefix}.count`;
        let pageDataKey = `${keyPrefix}.P${page}`;
        let count = 0;
        let dataRefs;
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
                let datas = await (0, cdata_1.cgetData)(this.cid, dataRefs, this.sds);
                if (datas) {
                    return getListData(count, page, pageSize, datas);
                }
            }
        }
        let data = await this.selector(page, pageSize, order, this.sds);
        let pl = this.cache.pipeline();
        pl.set(this.listKey, countKey, data.count);
        if (data.count > 0) {
            dataRefs = [];
            for (let i = 0; i < data.datas.length; i++) {
                let dataRef = {};
                (0, cdata_1.cset)(pl, data.datas[i], this.sds, this.expireMS, dataRef);
                dataRefs.push(dataRef);
            }
            pl.set(this.listKey, pageDataKey, JSON.stringify(dataRefs));
        }
        else {
            pl.set(this.listKey, pageDataKey, `[]`);
        }
        pl.expire(this.listKey, this.expireMS);
        pl.exec();
        return getListData(data.count, page, pageSize, data.datas);
    }
    async del(delDatas) {
        if (!delDatas) {
            return this.cache.del(this.listKey);
        }
        let pl = this.cache.pipeline();
        let data = await this.cache.get(this.listKey);
        if (data) {
            for (let key in data) {
                let val = data[key];
                if (!(typeof val === 'string' && val.startsWith('[{')))
                    continue;
                let dataRefs = JSON.parse(val);
                for (let dataRef of dataRefs) {
                    for (let sd of this.sds) {
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
    constructor(baseKey, sds, listNameParser, listFactory, expireMS) {
        this.baseKey = (typeof baseKey === 'string' ? { ns: baseKey } : baseKey);
        this.sds = sds;
        this.nameParser = listNameParser;
        this.factory = listFactory;
        this.listMap = {};
        this.expireMS = expireMS || cache_1.CacheManager.defaultExpireMS;
    }
    async sel(where, page, pageSize = 0, order = 'ASC') {
        let listName = this.nameParser(where);
        let list = this.listMap[listName];
        if (!list) {
            list = this.listMap[listName] = this.factory(where, { ...this.baseKey, listName }, this.sds, this.expireMS);
        }
        return list.sel(page, pageSize, order);
    }
    async del(where, delDatas = false, onDataRefsNotFound) {
        let listName = this.nameParser(where);
        let list = this.listMap[listName];
        if (!list)
            return;
        return list.del(delDatas, onDataRefsNotFound);
    }
    setTrigger(names) {
        if (typeof names === 'string') {
            trigger_1.Trigger.set(names, this.onTrigger);
        }
        else {
            for (let n of names) {
                trigger_1.Trigger.set(n, this.onTrigger);
            }
        }
        return this;
    }
    async onTrigger(where) {
        let listName = this.nameParser(where);
        let list = this.listMap[listName];
        if (!list)
            return;
        return list.del(false);
    }
}
exports.ListSet = ListSet;
//# sourceMappingURL=list.js.map