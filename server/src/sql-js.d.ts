declare module 'sql.js' {
  export interface Statement {
    bind(params?: any[]): Statement;
    get(): any[] | undefined;
    getAsObject(): Record<string, any> | undefined;
    run(params?: any[]): void;
    step(): boolean;
    reset(): void;
    free(): boolean;
  }

  export interface Database {
    run(sql: string, params?: any[]): Database;
    exec(sql: string): QueryExecResult[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }

  export interface QueryExecResult {
    columns: string[];
    values: any[][];
  }

  export default function initSqlJs(config?: any): Promise<{ Database: new (data?: Uint8Array | Buffer | null) => Database }>;
}
