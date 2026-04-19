import nextra from "nextra";
import type { NextConfig } from "next";

const withNextra = nextra({
  search: {
    codeblocks: false,
  },
});

const baseConfig: NextConfig = {};

export default withNextra(baseConfig);
