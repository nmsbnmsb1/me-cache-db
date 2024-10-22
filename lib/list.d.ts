import { INameKey } from './core/keys';
import { IFields } from './core/fields';
import { ISqlOptions, OrderDefinition } from './core/db';
import { IPageData } from './core/db.page';
import { IDataDescriptor, IData, DataTransformer } from './core/cdata';
export interface IListSelField extends IFields, ISqlOptions {
}
export interface IListDataDescriptor extends IDataDescriptor, ISqlOptions {
}
export type IListSelector = (listdds: IListDataDescriptor[], page: number, pageSize: number, order: 'ASC' | 'DESC') => Promise<{
    count: number;
    datas: IData[];
}>;
export interface IList {
    sel(fields: IListSelField[], page: number, pageSize: number, order: 'ASC' | 'DESC', raw?: boolean, forceDB?: boolean): Promise<IPageData>;
    del(delDatas: boolean, onDataRefsNotFound?: () => Promise<any[]>): Promise<void>;
}
export interface IListCacheConfig {
    cid: undefined | string;
    listKey: INameKey;
    expireMS?: number;
}
export declare class List implements IList {
    private cid;
    private listKey;
    private expireMS;
    private cache;
    private dds;
    private selector;
    private transform;
    constructor(cacheConfig: false | IListCacheConfig, dds: IDataDescriptor[], selector: IListSelector, transform?: DataTransformer);
    sel(fields: IListSelField[], page: number, pageSize: number, order?: OrderDefinition, raw?: boolean, forceDB?: boolean): Promise<IPageData>;
    del(delDatas: boolean): Promise<any>;
}
export type IListFactory = (listConfig: INameKey & any) => IList;
export declare class ListSet {
    private factory;
    private listMap;
    constructor(listFactory: IListFactory);
    sel(listConfig: INameKey & any, fields: IListSelField[], page: number, pageSize: number, order?: OrderDefinition, raw?: boolean, forceDB?: boolean): Promise<IPageData>;
    del(key: INameKey, delDatas?: boolean, onDataRefsNotFound?: () => Promise<any[]>): Promise<void>;
    setTrigger(names: string | string[]): this;
    private onTrigger;
}
