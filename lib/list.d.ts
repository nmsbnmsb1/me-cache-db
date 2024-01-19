import { ISqlOptions } from './core/db';
import { IDataStructDescriptor, IData, DataTransformer } from './core/cdata';
import { IFields } from './core/fields';
export interface IListKey {
    ns: string;
    listName: string;
}
export interface IListDataStructDescriptor extends IDataStructDescriptor, Partial<ISqlOptions> {
}
export interface IListPageData {
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
    datas: any[];
}
export type IListSelector = (page: number, pageSize: number, order: 'ASC' | 'DESC', sds: IListDataStructDescriptor[]) => Promise<{
    count: number;
    datas: IData[];
}>;
export interface IList {
    sel(page: number, pageSize: number, order: 'ASC' | 'DESC', fields?: IFields[], forceDB?: boolean): Promise<IListPageData>;
    del(delDatas: boolean, onDataRefsNotFound?: () => Promise<any[]>): Promise<void>;
}
export declare class List implements IList {
    private cid;
    private cache;
    private key;
    private listKey;
    private sds;
    private selector;
    private transform;
    private expireMS;
    constructor(cid: undefined | string, key: IListKey, sds: IListDataStructDescriptor[], selector: IListSelector, transform?: DataTransformer, expireMS?: number);
    sel(page: number, pageSize: number, order?: 'ASC' | 'DESC', fields?: IFields[], forceDB?: boolean): Promise<IListPageData>;
    del(delDatas: boolean): Promise<any>;
}
export type IListFactory = (where: IListKey | any) => IList;
export declare class ListSet {
    private factory;
    private listMap;
    constructor(listFactory: IListFactory);
    sel(where: IListKey | any, page: number, pageSize?: number, order?: 'ASC' | 'DESC', fields?: IFields[], forceDB?: boolean): Promise<IListPageData>;
    del(key: IListKey, delDatas?: boolean, onDataRefsNotFound?: () => Promise<any[]>): Promise<void>;
    setTrigger(names: string | string[]): this;
    private onTrigger;
}
