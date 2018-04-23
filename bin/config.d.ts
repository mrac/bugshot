import { Args } from './arguments';
export declare type Config = {
    baseDir: string;
    jestConfig: string;
    sourceFiles: string;
    ignore?: string[];
    jest?: any;
    dirs?: {
        currentDir: string;
        configDir: string;
    };
    faultFileExt?: string;
    testFileExt?: string;
    sourceFileToTestFileFn?: (sourcePath: string, config: Config) => string;
    sourceFileToFaultSourceFileFn?: (sourcePath: string, config: Config) => string;
    testFileToFaultTestFileFn?: (sourcePath: string, config: Config) => string;
    sourceFileToFaultTestFileFn?: (sourcePath: string, config: Config) => string;
};
export declare function getConfig(args: Args, currentDir: string): Config;
