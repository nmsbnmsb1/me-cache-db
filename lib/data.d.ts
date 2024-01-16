import { IDataStructDescriptor, IDataKey, IData } from './core/cdata';
export declare function sel(cid: undefined | string, data: IData | IData[], sds: IDataStructDescriptor[], selector: () => Promise<IData | IData[]>, forceDB?: boolean, expireMS?: number): Promise<IData | IData[]>;
export declare function selIn(cid: undefined | string, pkfield: string, pkvalues: any[], sd: IDataStructDescriptor, selector: () => Promise<IData[]>, forceDB?: boolean, expireMS?: number): Promise<IData | IData[]>;
export declare function update(cid: undefined | string, data: IData | IData[], sd: IDataStructDescriptor, updater: (data?: any) => Promise<boolean>, expireMS?: number): Promise<void>;
export declare function del(cid: undefined | string, data: IData | IData[], key: IDataKey, deleter: (data: any) => Promise<boolean>): Promise<void>;
