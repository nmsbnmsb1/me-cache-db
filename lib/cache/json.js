"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSONPipeline = exports.JSONCache = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const cache_1 = require("../core/cache");
function getPath(rootPath, key) {
    return node_path_1.default.resolve(rootPath, key);
}
function read(rootPath, key, createType) {
    let data;
    try {
        data = JSON.parse(node_fs_1.default.readFileSync(getPath(rootPath, key)).toString());
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
    node_fs_1.default.writeFileSync(getPath(rootPath, key), JSON.stringify(data));
}
function del(rootPath, key) {
    try {
        node_fs_1.default.unlinkSync(getPath(rootPath, key));
    }
    catch (e) { }
}
const md5Map = {};
class JSONCache {
    constructor(rootPath) {
        this.rootPath = node_path_1.default.resolve();
        this.rootPath = rootPath;
        if (!node_fs_1.default.existsSync(this.rootPath)) {
            node_fs_1.default.mkdirSync(this.rootPath);
        }
    }
    getKey(prefix, ns, nn) {
        let key = `${prefix}_${ns}_${nn}`;
        if (`${nn}`.match(/^[0-9a-zA-Z_]+$/g)) {
            return key;
        }
        if (md5Map[key]) {
            return md5Map[key];
        }
        return (md5Map[key] = `${prefix}_${ns}_${node_crypto_1.default
            .createHash('md5')
            .update(Buffer.from(`${nn}`, 'utf8'))
            .digest('hex')}`);
    }
    async exists(key) {
        return node_fs_1.default.existsSync(getPath(this.rootPath, key));
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
        if (!fields) {
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