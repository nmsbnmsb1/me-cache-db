"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSONPipeline = exports.JSONCache = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const cache_1 = require("../core/cache");
function getPath(rootPath, key) {
    return path_1.default.resolve(rootPath, key);
}
function read(rootPath, key, createType) {
    let data;
    try {
        data = JSON.parse(fs_1.default.readFileSync(getPath(rootPath, key)).toString());
        if (data.expire > 0 && Date.now() > data.expire) {
            data = undefined;
        }
    }
    catch (e) { }
    if (!data && createType) {
        data = {
            data: createType === 'Array' ? [] : {},
            expire: Date.now() + cache_1.CacheManager.defaultExpireMS,
        };
    }
    return data;
}
function write(rootPath, key, data) {
    fs_1.default.writeFileSync(getPath(rootPath, key), JSON.stringify(data));
}
function del(rootPath, key) {
    try {
        fs_1.default.unlinkSync(getPath(rootPath, key));
    }
    catch (e) { }
}
class JSONCache {
    constructor(rootPath) {
        this.rootPath = path_1.default.resolve();
        this.rootPath = rootPath;
        if (!fs_1.default.existsSync(this.rootPath)) {
            fs_1.default.mkdirSync(this.rootPath);
        }
    }
    getKey(prefix, ns, pk) {
        return `${prefix}_${ns}_${pk.replace(/\//g, '_')}`;
    }
    async exists(key) {
        return fs_1.default.existsSync(getPath(this.rootPath, key));
    }
    async expire(key, ms) {
        let data = read(this.rootPath, key);
        if (!data)
            return;
        data.expire = ms === 0 ? 0 : Date.now() + ms;
        write(this.rootPath, key, data);
    }
    async del(key) {
        del(this.rootPath, key);
    }
    async set(key, field, value) {
        let data = read(this.rootPath, key, 'Object');
        if (typeof field === 'string') {
            data.data[field] = value;
        }
        else {
            for (let f in field) {
                data.data[f] = field[f];
            }
        }
        write(this.rootPath, key, data);
    }
    async get(key, fields) {
        let data = read(this.rootPath, key);
        if (!data)
            return;
        if (!fields)
            return data.data;
        let ndata = {};
        for (let f of fields) {
            ndata[f] = data.data[f];
        }
        return ndata;
    }
    pipeline() {
        return new JSONPipeline(this, this.rootPath);
    }
}
exports.JSONCache = JSONCache;
JSONCache.CID = 'json';
class JSONPipeline {
    constructor(parent, rootPath) {
        this.dataMap = {};
        this.parent = parent;
        this.rootPath = rootPath;
    }
    getCache() {
        return this.parent;
    }
    getData(key, createType) {
        if (!this.dataMap[key]) {
            let data = read(this.rootPath, key, createType);
            if (data) {
                this.dataMap[key] = data;
            }
        }
        return this.dataMap[key];
    }
    set(key, field, value) {
        let data = this.getData(key, 'Object');
        data.data[field] = value;
        data.needWrite = true;
    }
    get(key, fields, cb) {
        let data = this.getData(key);
        if (!data) {
            return cb(undefined, undefined);
        }
        else if (!fields) {
            return cb(undefined, data.data);
        }
        let ndata = {};
        for (let f of fields) {
            ndata[f] = data.data[f];
        }
        return cb(undefined, ndata);
    }
    expire(key, ms) {
        let data = this.getData(key);
        if (data) {
            data.expire = ms === 0 ? 0 : Date.now() + ms;
        }
    }
    del(key) {
        delete this.dataMap[key];
        del(this.rootPath, key);
    }
    async exec() {
        for (let key in this.dataMap) {
            let data = this.dataMap[key];
            if (data.needWrite) {
                delete data.needWrite;
                write(this.rootPath, key, data);
            }
        }
        this.dataMap = undefined;
    }
}
exports.JSONPipeline = JSONPipeline;
//# sourceMappingURL=json.js.map