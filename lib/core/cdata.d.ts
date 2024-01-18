import { IFields } from './fields';
import { ICache, ICachePipeline } from './cache';
export declare const metadataField = "$metadata";
export interface IData {
    [dataField: string]: any;
    [metadataField]?: any;
}
export interface IDataKey {
    ns: string;
    pkfield: string;
}
export interface IDataStructDescriptor extends IDataKey, IFields {
}
export type DataTransformer = (data: IData, metadatas?: any) => any | Promise<any>;
export declare const Transformer: {
    transform: DataTransformer;
};
export declare function cget(pl: ICachePipeline, context: {
    done?: boolean;
    data: any;
    ps?: Promise<any>[];
}, index: undefined | number | string, data: IData, sds: IDataStructDescriptor[], transform?: boolean | DataTransformer): void;
export declare function cgetData(cid: undefined | string | ICache | ICachePipeline, data: IData | IData[], sds: IDataStructDescriptor[], transform?: boolean | DataTransformer): Promise<any>;
export declare function cset(pl: ICachePipeline, context: {
    data: any;
    ps?: Promise<any>[];
}, index: number | string, data: IData, sds: IDataStructDescriptor[], transform?: boolean | DataTransformer, dataRefs?: {
    [dataPkField: string]: any;
}, expireMS?: number): Promise<void>;
export declare function csetData(cid: undefined | string | ICache | ICachePipeline, data: IData | IData[], sds: IDataStructDescriptor[], transform?: boolean | DataTransformer, expireMS?: number): Promise<any>;
export declare function cexists(cid: undefined | string, key: string | {
    prefix?: string;
    ns: string;
    pk: string;
}): Promise<boolean>;
export declare function cdel(cid: undefined | string, key: string | {
    prefix?: string;
    ns: string;
    pk: string;
}): Promise<any>;
export declare function cexpire(cid: undefined | string, key: string | {
    prefix?: string;
    ns: string;
    pk: string;
}, ms: number): Promise<any>;
