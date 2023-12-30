import { IDataStructDescriptor, IDataKey, IData } from './core/cdata';
export declare function sel(cid: undefined | string, data: IData | IData[], sds: IDataStructDescriptor[], selector: () => Promise<IData | IData[]>, forceDB?: boolean, expireMS?: number): Promise<IData | IData[]>;
export declare function update(cid: undefined | string, data: any, updater: (data: any) => Promise<number>, keys: (IDataKey & {
    pk: string;
})[]): Promise<boolean>;
export declare function del(cid: undefined | string, data: any, deleter: (data: any) => Promise<number>, keys: (IDataKey & {
    pk: string;
})[]): Promise<boolean>;
