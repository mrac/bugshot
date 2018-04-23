import { Config } from './config';
export declare function getAbsoluteSourcePaths(config: Config): Promise<string[]>;
export declare function readFile(absolutePath: string): string;
export declare function writeFile(absolutePath: string, text: string): void;
export declare function deleteTemporaryFiles(config: Config): Promise<void>;
