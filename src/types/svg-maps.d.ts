// Type shim for svg-maps__common (peer dep of @svg-maps/usa and @svg-maps/world)
declare module "svg-maps__common" {
  export interface Location {
    name: string;
    id: string;
    path: string;
  }
  export interface Map {
    label: string;
    viewBox: string;
    locations: Location[];
  }
}

declare module "@svg-maps/world" {
  import type { Map } from "svg-maps__common";
  const world: Map;
  export default world;
}
