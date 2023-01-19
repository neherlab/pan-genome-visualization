declare class Route<TParams extends Record<string, unknown> = { [i: string]: any }> {
  constructor(spec: string)
  match(pathname: string): { [k in keyof TParams]: string } | undefined
  reverse(params: TParams): string | undefined
}
declare namespace Route {}
export = Route
