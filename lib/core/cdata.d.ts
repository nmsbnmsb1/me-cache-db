import { IFields } from './fields';
import { ICache, ICachePipeline } from './cache';
export interface IData {
    [dataField: string]: any;
}
export interface IDataKey {
    ns: string;
    pkfield: string;
}
export interface IDataStructDescriptor extends IDataKey, IFields {
}
export interface IHandledStructDescriptor extends IDataStructDescriptor {
    __handled: boolean;
    nas?: {
        [f: string]: string | false;
    };
    dataPkField: string;
    dfields?: {
        [f: string]: boolean;
    };
}
export declare function handleStructDescriptor(sd: any): IHandledStructDescriptor;
export declare function cget(pl: ICachePipeline, store: {
    data: IData | IData[];
}, index: number, data: IData, sds: IDataStructDescriptor[]): void;
export declare function cgetData(cid: undefined | string | ICache | ICachePipeline, data: IData | IData[], sds: IDataStructDescriptor[]): Promise<IData | IData[]>;
export declare function cset(pl: ICachePipeline, data: IData, sds: IDataStructDescriptor[], expireMS?: number, dataRefs?: {
    [dataPkField: string]: any;
}): void;
export declare function csetData(cid: undefined | string | ICache | ICachePipeline, data: IData | IData[], sds: IDataStructDescriptor[], expireMS?: number): Promise<IData | IData[]>;
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
