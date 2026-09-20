import { defineWebExtConfig } from "wxt";

const edgeBinary = process.env.WXT_EDGE_BINARY?.trim();

export default defineWebExtConfig({
  // Only override WXT's Chromium browser when this machine provides a path.
  // Other developers can keep using their default browser without any change.
  binaries: edgeBinary ? { edge: edgeBinary } : {},
});
