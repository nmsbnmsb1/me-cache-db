import { FieldsOptions } from './fields';
import { Cache, CachePipeline } from './cache';
import { DataKey } from './keys';
export interface Data {
    [dataField: string]: any;
}
export interface DataDescriptor extends DataKey, FieldsOptions {
}
export type DataTransformer = (data: Data) => any | Promise<any>;
export declare function cget(pl: CachePipeline, context: {
    done?: boolean;
    data: any;
    ps?: Promise<any>[];
}, index: undefined | number | string, data: Data, dds: DataDescriptor[], transform?: DataTransformer): void;
export declare function cgetData(cid: undefined | string | Cache | CachePipeline, data: Data | Data[], dds: DataDescriptor[], transform?: DataTransformer): Promise<any>;
export declare function cset(pl: CachePipeline, context: {
    data: any;
    ps?: Promise<any>[];
}, index: number | string, data: Data, dds: DataDescriptor[], transform?: DataTransformer, dataRefs?: {
    [dataPkField: string]: any;
}, expireMS?: number): Promise<void>;
export declare function csetData(cid: undefined | string | Cache | CachePipeline, data: Data | Data[], dds: DataDescriptor[], transform?: DataTransformer, expireMS?: number): Promise<any>;
export declare function cexists(cid: undefined | string, key: string | {
    prefix?: string;
    ns: string;
    nn: string;
}): Promise<boolean>;
export declare function cdel(cid: undefined | string, key: string | {
    prefix?: string;
    ns: string;
    nn: string;
}): Promise<any>;
export declare function cdelDatas(cid: undefined | string | Cache | CachePipeline, key: {
    prefix?: string;
} & DataKey, datas: any[]): Promise<any>;
export declare function cexpire(cid: undefined | string, key: string | {
    prefix?: string;
    ns: string;
    nn: string;
}, ms: number): Promise<any>;
