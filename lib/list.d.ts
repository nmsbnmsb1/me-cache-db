import { ISqlOptions } from './core/db';
import { IDataStructDescriptor, IData } from './core/cdata';
export interface IListKey {
    ns: string;
    listName: string;
}
export interface IListDataStructDescriptor extends IDataStructDescriptor, ISqlOptions {
}
export interface IListPageData {
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
    datas: IData[];
}
export type IListSelector = (page: number, pageSize: number, order: 'ASC' | 'DESC', sds: IListDataStructDescriptor[]) => Promise<{
    count: number;
    datas: IData[];
}>;
export interface IList {
    sel(page: number, pageSize: number, order: 'ASC' | 'DESC'): Promise<IListPageData>;
    del(delDatas: boolean, onDataRefsNotFound?: () => Promise<any[]>): Promise<void>;
}
export declare class List implements IList {
    private cid;
    private cache;
    private key;
    private listKey;
    private sds;
    private selector;
    private expireMS;
    constructor(cid: undefined | string, key: IListKey, sds: IListDataStructDescriptor[], selector: IListSelector, expireMS?: number);
    sel(page: number, pageSize: number, order?: 'ASC' | 'DESC'): Promise<IListPageData>;
    del(delDatas: boolean): Promise<any>;
}
export type IListFactory = (where: any, key: IListKey, sds: IListDataStructDescriptor[], expire: number) => IList;
export type IListNameParser = (where: any) => string;
export declare class ListSet {
    private baseKey;
    private sds;
    private nameParser;
    private factory;
    private listMap;
    private expireMS;
    constructor(baseKey: string | {
        prefix?: string;
        ns: string;
    }, sds: IListDataStructDescriptor[], listNameParser: IListNameParser, listFactory: IListFactory, expireMS?: number);
    sel(where: any, page: number, pageSize?: number, order?: 'ASC' | 'DESC'): Promise<IListPageData>;
    del(where: any, delDatas?: boolean, onDataRefsNotFound?: () => Promise<any[]>): Promise<void>;
    setTrigger(names: string | string[]): this;
    private onTrigger;
}
