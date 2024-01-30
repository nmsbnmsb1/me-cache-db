import { IFields } from './fields';
export type IQuery = {
    query(sql: string): Promise<any>;
} | ((sql: string) => Promise<any>);
export declare function toBoolean(b: any): 0 | 1;
export declare function escape(str: string): string;
export declare function sanitizeSQL(sql: string): string;
export type ISqlStatement = string | (() => string);
export type IOn = {
    [field: string]: {
        tableName: string;
        onField: string;
    };
};
export type IWhere = {
    [field: string]: any;
    __set: string;
};
export type IOrder = {
    [field: string]: 'asc' | 'ASC' | 'desc' | 'DESC' | string;
    __set: string;
};
export interface ISqlOptions extends IFields {
    tableName: string;
    on: IOn;
    where: ISqlStatement | IWhere;
    order?: ISqlStatement | IOrder;
}
export declare function doPage(page: number, pageSize: number, countField: string, sql: string, e: IQuery): Promise<{
    count: any;
    page: number;
    pageSize: number;
    totalPages: number;
    datas: any;
}>;
export declare function getLeftJoinSql(options: ISqlOptions[]): string;
