// Signature themes → their bespoke homepages. Category pages, product
// pages, cart and checkout stay shared and pick up the theme's tokens.
import type { ComponentType } from "react";
import type { StorefrontHomeProps } from "../StorefrontHome";
import ClarityHome from "./clarity/ClarityHome";
import CraveHome from "./crave/CraveHome";
import EmberHome from "./ember/EmberHome";
import NexusHome from "./nexus/NexusHome";
import TerraHome from "./terra/TerraHome";

const HOMES: Record<string, ComponentType<StorefrontHomeProps>> = {
  ember: EmberHome,
  crave: CraveHome,
  nexus: NexusHome,
  clarity: ClarityHome,
  terra: TerraHome,
};

export function signatureHome(themeId: string): ComponentType<StorefrontHomeProps> | null {
  return HOMES[themeId] ?? null;
}
