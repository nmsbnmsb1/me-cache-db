import { IDataStructDescriptor, IDataKey, IData, DataTransformer } from './core/cdata';
export declare function sel(cid: undefined | string, data: IData | IData[], sds: IDataStructDescriptor[], selector: () => Promise<IData | IData[]>, transform?: boolean | DataTransformer, forceDB?: boolean, expireMS?: number): Promise<any>;
export declare function selIn(cid: undefined | string, pkfield: string, pkvalues: any[], sd: IDataStructDescriptor, selector: () => Promise<IData[]>, transform?: boolean | DataTransformer, forceDB?: boolean, expireMS?: number): Promise<any>;
export declare function update(cid: undefined | string, data: IData | IData[], sd: IDataStructDescriptor, updater: (data?: any) => Promise<boolean>, handleCache?: 'update' | 'del', expireMS?: number): Promise<void>;
export declare function del(cid: undefined | string, data: IData | IData[], key: IDataKey, deleter: (data: any) => Promise<boolean>): Promise<void>;
