export type WhereOperator = '>' | '>=' | '<' | '<=' | '=' | '!=' | 'is' | 'is not' | 'like' | 'not like' | 'in' | 'between';
export type WhereValue = null | undefined | string | number;
export type WhereMultiValue = WhereValue[];
export type WhereOP = [WhereOperator, WhereValue | WhereMultiValue];
export interface WhereLogic {
    _logic?: string;
}
export type WhereComposite = WhereLogic & {
    [key in WhereOperator]?: WhereValue | WhereMultiValue;
};
export type Where = WhereValue | WhereOP | WhereComposite;
export interface WhereOptions extends WhereLogic {
    [field: string]: Where;
}
export declare function getFieldWhereSql(field: string, where: Where): string;
export declare function getWhereSql(asPrefix: string, wo: WhereOptions): string;
