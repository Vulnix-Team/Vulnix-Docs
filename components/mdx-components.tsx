import defaultMdxComponents from "fumadocs-ui/mdx";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { TypeTable } from "fumadocs-ui/components/type-table";
import { File, Files, Folder } from "fumadocs-ui/components/files";
import { Banner } from "fumadocs-ui/components/banner";
import { InlineTOC } from "fumadocs-ui/components/inline-toc";
import { DocsGraph } from "@/components/docs-graph";
import type { MDXComponents } from "mdx/types";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Step,
    Steps,
    Tab,
    Tabs,
    Accordion,
    Accordions,
    TypeTable,
    File,
    Files,
    Folder,
    Banner,
    InlineTOC,
    DocsGraph,
    ...components,
  };
}
