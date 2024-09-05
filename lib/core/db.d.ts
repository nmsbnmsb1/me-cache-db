import { IFields } from './fields';
export declare function toBoolean(b: any): 0 | 1;
export declare function escape(str: string): string;
export declare function sanitizeSQL(sql: string): string;
export interface IPageData {
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
    datas: any[];
}
export type Query = (sql: string) => Promise<any>;
export declare function doPage(page: number, pageSize: number, countField: string, sql: string, query: Query): Promise<IPageData>;
export type SqlStatement = string | (() => string);
export interface IOn {
    [field: string]: {
        tableName: string;
        onField: string;
    };
}
export interface IWhere {
    __set?: string;
    [field: string]: any;
}
export interface IOrder {
    __set?: string;
    [field: string]: 'asc' | 'ASC' | 'desc' | 'DESC' | string;
}
export interface ISqlOptions extends IFields {
    tableName: string;
    on?: IOn;
    where: SqlStatement | IWhere;
    order?: SqlStatement | IOrder;
}
export declare function getLeftJoinSql(options: ISqlOptions[]): string;
