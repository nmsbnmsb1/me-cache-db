import { NameKey } from './core/keys';
import { SqlOptions, OrderDefinition } from './core/db';
import { PageData } from './core/db.page';
import { DataDescriptor, Data, DataTransformer } from './core/cdata';
export interface ListSelField extends SqlOptions {
}
export interface ListDataDescriptor extends DataDescriptor, SqlOptions {
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
    constructor(listFactory: ListFactory);
    sel(listConfig: NameKey & any, fields: ListSelField[], page: number, pageSize: number, order?: OrderDefinition, raw?: boolean, forceDB?: boolean): Promise<PageData>;
    del(key: NameKey, delDatas?: boolean, onDataRefsNotFound?: () => Promise<any[]>): Promise<void>;
    setTrigger(names: string | string[]): this;
    private onTrigger;
}
