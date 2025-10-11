declare module "js-yaml" {
  interface LoadOptions {
    filename?: string;
    schema?: unknown;
    json?: boolean;
  }

  export function load(src: string, options?: LoadOptions): unknown;
}
