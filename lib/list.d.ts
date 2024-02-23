import { INameKey } from './core/keys';
import { IFields } from './core/fields';
import { IPageData, ISqlOptions } from './core/db';
import { IDataDescriptor, IData, DataTransformer } from './core/cdata';
export interface IListDataDescriptor extends IDataDescriptor, Partial<ISqlOptions> {
}
export type IListSelector = (page: number, pageSize: number, order: 'ASC' | 'DESC', ldds: IListDataDescriptor[]) => Promise<{
    count: number;
    datas: IData[];
}>;
export interface IList {
    sel(page: number, pageSize: number, order: 'ASC' | 'DESC', fields?: IFields[], raw?: boolean, forceDB?: boolean): Promise<IPageData>;
    del(delDatas: boolean, onDataRefsNotFound?: () => Promise<any[]>): Promise<void>;
}
export declare class List implements IList {
    private cid;
    private cache;
    private key;
    private listKey;
    private ldds;
    private selector;
    private transform;
    private expireMS;
    constructor(cid: undefined | string, key: INameKey, ldds: IListDataDescriptor[], selector: IListSelector, transform?: DataTransformer, expireMS?: number);
    sel(page: number, pageSize: number, order?: 'ASC' | 'DESC', fields?: IFields[], raw?: boolean, forceDB?: boolean): Promise<IPageData>;
    del(delDatas: boolean): Promise<any>;
}
export type IListFactory = (where: INameKey | any) => IList;
export declare class ListSet {
    private factory;
    private listMap;
    constructor(listFactory: IListFactory);
    sel(where: INameKey | any, page: number, pageSize?: number, order?: 'ASC' | 'DESC', fields?: IFields[], raw?: boolean, forceDB?: boolean): Promise<IPageData>;
    del(key: INameKey, delDatas?: boolean, onDataRefsNotFound?: () => Promise<any[]>): Promise<void>;
    setTrigger(names: string | string[]): this;
    private onTrigger;
}
