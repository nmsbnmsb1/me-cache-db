export interface As {
    as?: string;
}
export declare function hasAs(as: string, asField: string): boolean;
export declare function attachAs(as: string, field: string): string;
export declare function cutAs(as: string, asField: string): string;
export interface FieldsModifier {
    [name: string]: boolean | 'override';
}
export interface FieldsOptions extends As {
    fields?: string | string[];
    fieldsModifier?: FieldsModifier;
    fieldsNeeded?: string[];
}
export type Fields = string | string[] | FieldsOptions;
export declare function pickFields(fields: Fields, modifier?: FieldsModifier): string[];
export declare function filterDataFields(data: any, fields: Fields, modifier?: FieldsModifier): any;
export declare class FieldScheme {
    private base;
    private m;
    constructor(base: string | string[], m: {
        [scheme: string]: string | string[] | FieldsModifier;
    });
    getBase(): string[];
    getFields(fields: string | Fields): string[];
    getFieldsOptions(fields: string | Fields): FieldsOptions;
    filterDataFields(data: any, fields: string | Fields): string;
}
