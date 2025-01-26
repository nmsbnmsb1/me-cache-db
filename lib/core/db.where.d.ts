export declare const WhereOperatorEnum: readonly [">", ">=", "<", "<=", "=", "!=", "IS", "is", "IS NOT", "is not", "LIKE", "like", "NOT LIKE", "not like", "IN", "in", "NOT IN", "not in", "BETWEEN", "between", "NOT BETWEEN", "not between"];
export type WhereOperator = (typeof WhereOperatorEnum)[number];
export declare const WhereLogicRangeEnum: readonly ["(", ")"];
export type WhereLogicRange = (typeof WhereLogicRangeEnum)[number];
export declare const WhereLogicValueEnum: readonly ["AND", "and", "OR", "or"];
export type WhereLogicValue = (typeof WhereLogicValueEnum)[number];
export type WhereValue = null | string | number;
export type WhereValues = WhereValue[];
export type WhereOP = ((WhereOperator | WhereLogicRange | WhereLogicValue | string) | (WhereValue | WhereValues))[];
export type Where = WhereValue | WhereOP;
export type WhereComposite = {
    [field: string]: Where;
} & {
    _logic?: WhereLogicValue | string;
};
export type WhereOptions = {
    [field: string]: Where | WhereComposite;
};
export declare function getFieldWhereSql(field: string, where: Where): string;
export declare function getWhereSql(asPrefix: string, wo: WhereOptions): string;
