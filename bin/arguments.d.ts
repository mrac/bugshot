export declare type Args = {
    config: string;
    t?: string;
    p?: string;
    o?: number;
    keep?: boolean;
    occurances?: boolean;
};
export declare function getArguments(argv: string[]): Args;
