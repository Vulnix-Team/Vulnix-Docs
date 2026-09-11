import { GraphView } from "@/components/graph-view";
import { buildGraph } from "@/lib/build-graph";

export function DocsGraph() {
  return <GraphView graph={buildGraph()} />;
}
