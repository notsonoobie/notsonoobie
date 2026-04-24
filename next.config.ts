import type { NextConfig } from "next";
import nextra from "nextra";

const withNextra = nextra({
  search: {
    codeblocks: false,
  },
});

const baseConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.103"],
};

export default withNextra(baseConfig);
