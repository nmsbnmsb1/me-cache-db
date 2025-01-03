import { type Cache } from './core/cache';
import { type Data, type DataDescriptor, type DataTransformer } from './core/cdata';
import type { OrderDefinition, SqlOptions } from './core/db';
import type { PageData } from './core/db.page';
import { type FieldsOptions } from './core/fields';
import type { NameKey } from './core/keys';
export interface ListDataDescriptor extends DataDescriptor, SqlOptions {
}
export interface ListSelField extends FieldsOptions, SqlOptions {
}
export type ListSelector = (listdds: ListDataDescriptor[], page: number, pageSize: number, order: 'ASC' | 'DESC') => Promise<{
    count: number;
    datas: Data[];
}>;
export interface List {
    sel(fields: ListSelField[], page: number, pageSize: number, order: 'ASC' | 'DESC', raw?: boolean, forceDB?: boolean): Promise<PageData>;
    del(delDatas: boolean, onDataRefsNotFound?: () => Promise<any[]>): Promise<void>;
}
export interface ListCacheConfig {
    cid: undefined | string;
    listKey: NameKey;
    expireMS?: number;
}
export declare class CommonList implements List {
    private cid;
    private listKey;
    private expireMS;
    private cache;
    private dds;
    private selector;
    private transform;
    constructor(cacheConfig: false | ListCacheConfig, dds: DataDescriptor[], selector: ListSelector, transform?: DataTransformer);
    sel(fields: ListSelField[], page: number, pageSize: number, order?: OrderDefinition, raw?: boolean, forceDB?: boolean): Promise<PageData>;
    del(delDatas: boolean): Promise<any>;
}
export type ListFactory = (listConfig: NameKey & any) => List;
export declare class ListSet {
    private factory;
    private listMap;
    private ln;
    private onDelListCache;
    setFactory(listFactory: ListFactory): this;
    setTrigger(...names: string[]): this;
    setDelListCacheHandler(handler: (key: NameKey, cache: Cache, listKey: string) => any): this;
    private onTrigger;
    sel(listConfig: NameKey & any, fields: ListSelField[], page: number, pageSize: number, order?: OrderDefinition, raw?: boolean, forceDB?: boolean): Promise<PageData>;
    del(key: NameKey, delDatas?: boolean, onDataRefsNotFound?: () => Promise<any[]>): Promise<void>;
}
