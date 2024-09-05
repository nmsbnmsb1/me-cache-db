export type IOnTrigger = (body: any) => Promise<any>;
export declare class Trigger {
    private static map;
    static set(name: string, onTrigger: IOnTrigger): void;
    static do(name: string, body?: any): Promise<void>;
}
