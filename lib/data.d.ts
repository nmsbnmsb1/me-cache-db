import { IDataDescriptor, IData, DataTransformer } from './core/cdata';
import { IDataKey } from './core/keys';
export declare function sel(cid: undefined | string, data: IData | IData[], dds: IDataDescriptor[], selector: () => Promise<IData | IData[]>, transform?: DataTransformer, forceDB?: boolean, expireMS?: number): Promise<any>;
export declare function selIn(cid: undefined | string, pkfield: string, pkvalues: any[], dd: IDataDescriptor, selector: () => Promise<IData[]>, transform?: DataTransformer, forceDB?: boolean, expireMS?: number): Promise<any>;
export declare function update(cid: undefined | string, data: IData | IData[], dd: IDataDescriptor, updater: (data?: any) => Promise<any>, handleCache?: 'update' | 'del', expireMS?: number): Promise<any[] | IData>;
export declare function del(cid: undefined | string, data: IData | IData[], key: IDataKey, deleter: (data: any) => Promise<boolean>): Promise<void>;
