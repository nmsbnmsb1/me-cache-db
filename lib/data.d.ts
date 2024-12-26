import { type Data, type DataDescriptor, type DataTransformer } from './core/cdata';
import type { DataKey } from './core/keys';
export declare function sel(cid: undefined | string, data: Data | Data[], dds: DataDescriptor[], selector: () => Promise<Data | Data[]>, transform?: DataTransformer, forceDB?: boolean, expireMS?: number): Promise<any>;
export declare function selIn(cid: undefined | string, pkfield: string, pkvalues: any[], dd: DataDescriptor, selector: () => Promise<Data[]>, transform?: DataTransformer, forceDB?: boolean, expireMS?: number): Promise<any>;
export declare function update(cid: undefined | string, data: Data | Data[], dd: DataDescriptor, updater: (data?: any) => Promise<any>, handleCache?: 'update' | 'del', expireMS?: number): Promise<any[] | Data>;
export declare function del(cid: undefined | string, data: Data | Data[], key: DataKey, deleter: (data: any) => Promise<boolean>): Promise<void>;
