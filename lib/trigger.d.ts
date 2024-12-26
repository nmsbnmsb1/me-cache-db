export type IOnTrigger = (body: any) => Promise<any>;
export declare const Trigger: {
    set(name: string, onTrigger: IOnTrigger): void;
    do(name: string, body?: any): Promise<void>;
};
