// Signature themes → their bespoke homepages. Category pages, product
// pages, cart and checkout stay shared and pick up the theme's tokens.
import type { ComponentType } from "react";
import type { StorefrontHomeProps } from "../StorefrontHome";
import BlitzHome from "./blitz/BlitzHome";
import ClarityHome from "./clarity/ClarityHome";
import CraveHome from "./crave/CraveHome";
import DewHome from "./dew/DewHome";
import EmberHome from "./ember/EmberHome";
import NexusHome from "./nexus/NexusHome";
import NovaHome from "./nova/NovaHome";
import PrismHome from "./prism/PrismHome";
import PulseHome from "./pulse/PulseHome";
import StrideHome from "./stride/StrideHome";
import TerraHome from "./terra/TerraHome";

const HOMES: Record<string, ComponentType<StorefrontHomeProps>> = {
  ember: EmberHome,
  crave: CraveHome,
  nexus: NexusHome,
  clarity: ClarityHome,
  terra: TerraHome,
  blitz: BlitzHome,
  stride: StrideHome,
  pulse: PulseHome,
  nova: NovaHome,
  dew: DewHome,
  prism: PrismHome,
};

export function signatureHome(themeId: string): ComponentType<StorefrontHomeProps> | null {
  return HOMES[themeId] ?? null;
}
