import { IFields } from './fields';
import { ICache, ICachePipeline } from './cache';
import { IDataKey } from './key';
export interface IData {
    [dataField: string]: any;
}
export interface IDataDescriptor extends IDataKey, IFields {
}
export type DataTransformer = (data: IData) => any | Promise<any>;
export declare function cget(pl: ICachePipeline, context: {
    done?: boolean;
    data: any;
    ps?: Promise<any>[];
}, index: undefined | number | string, data: IData, dds: IDataDescriptor[], transform?: DataTransformer): void;
export declare function cgetData(cid: undefined | string | ICache | ICachePipeline, data: IData | IData[], dds: IDataDescriptor[], transform?: DataTransformer): Promise<any>;
export declare function cset(pl: ICachePipeline, context: {
    data: any;
    ps?: Promise<any>[];
}, index: number | string, data: IData, dds: IDataDescriptor[], transform?: DataTransformer, dataRefs?: {
    [dataPkField: string]: any;
}, expireMS?: number): Promise<void>;
export declare function csetData(cid: undefined | string | ICache | ICachePipeline, data: IData | IData[], dds: IDataDescriptor[], transform?: DataTransformer, expireMS?: number): Promise<any>;
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
export declare function cdelData(cid: undefined | string | ICache | ICachePipeline, key: {
    prefix?: string;
} & IDataKey, datas: any[]): Promise<any>;
export declare function cexpire(cid: undefined | string, key: string | {
    prefix?: string;
    ns: string;
    nn: string;
}, ms: number): Promise<any>;
