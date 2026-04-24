// Origin used for every absolute URL the app emits (OG, JSON-LD, sitemap,
// robots, canonicals, newsletter email footers). Set via SITE_URL env var,
// falls back to the production domain so local dev / fresh clones still
// work without a .env.local.
const FALLBACK_SITE_URL = "https://agenticwithrahul.in";
export const SITE_URL = (
  process.env.SITE_URL ?? FALLBACK_SITE_URL
).replace(/\/$/, "");
/** Hostname form of SITE_URL — use for display strings ("agenticwithrahul.in") */
export const SITE_HOST = new URL(SITE_URL).host;
export const SITE_NAME = "Rahul Gupta — Portfolio";
export const SITE_SHORT_NAME = "Rahul Gupta";
export const SITE_AUTHOR = "Rahul Gupta";
export const SITE_LOCALE = "en_IN";
export const SITE_TITLE_TEMPLATE = "%s · Rahul Gupta";
export const SITE_TITLE_DEFAULT =
  "Rahul Gupta — Senior Software Engineer · Solutions Architect · Agentic AI";
export const SITE_DESCRIPTION =
  "Senior Software Engineer and Solutions Architect with 6 years designing distributed, event-driven systems and agentic AI platforms on AWS, OCI, and Kubernetes. Founding architect of Atlas API Manager, Atlas AI Agent Studio, Atlas AIOps, IT Compliance Manager, and Patch Command Center — adopted across BFSI and NBFC customers.";
export const SITE_KEYWORDS = [
  "Rahul Gupta",
  "Senior Software Engineer",
  "Solutions Architect",
  "Agentic AI Engineer",
  "Product Engineer",
  "Tech Lead",
  "Distributed Systems",
  "Event-Driven Architecture",
  "Microservices",
  "Kubernetes",
  "AWS",
  "Oracle Cloud",
  "LLM",
  "RAG",
  "MCP",
  "Langchain",
  "Langgraph",
  "API Management",
  "Atlas API Manager",
  "Atlas AI Agent Studio",
  "Atlas AIOps",
  "BFSI",
  "NBFC",
  "Fintech",
  "Mumbai",
  "India",
];
