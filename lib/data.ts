export type Stat = {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  format?: "plain" | "plus" | "comma";
};

export type Product = {
  id: string;
  name: string;
  tagline: string;
  role: string;
  lead: string;
  highlights: string[];
  tech: string[];
  accent: "cyan" | "amber" | "mint" | "violet" | "rose";
  variant: "api" | "agent" | "compliance" | "patch" | "aiops";
};

export type SkillGroup = {
  label: string;
  items: string[];
};

export type Role = {
  company: string;
  title: string;
  period: string;
  highlights: string[];
};

export const profile = {
  name: "Rahul Gupta",
  title: "Senior Software Engineer · Solutions Architect · Agentic AI",
  tagline: "Architecting distributed systems. Embedding intelligence.",
  summary:
    "Product engineer and solutions architect with 6 years of experience designing distributed, event-driven systems on AWS and Oracle Cloud. Tech lead behind multiple enterprise-grade products adopted across BFSI and NBFC customers — spanning API management, agentic AI, IT compliance, patching automation, and AIOps. Focused on the intersection of cloud-native microservices at scale and embedding LLM-powered capabilities into production platforms.",
  location: "Mumbai, Maharashtra · India",
  availability: "Open to Mumbai / Pune / Bangalore · WFO · WFH · Hybrid",
  email: "notsonoobiee@gmail.com",
  phone: "+91 8928885199",
  linkedin: "https://www.linkedin.com/in/rahul-gupta-6a5967188/",
  github: "https://github.com/notsonoobie",
  cal: "https://cal.com/agentic-with-rahul-gupta/15min",
  resumePdf: "/Rahul_Gupta_Resume.pdf",
  resumeDocx: "/Rahul_Gupta_Resume.docx",
};

export const stats: Stat[] = [
  { label: "enterprise customers", value: 15, suffix: "+" },
  { label: "flagship products", value: 5, suffix: "+" },
  { label: "API calls / day", value: 15, suffix: "M+" },
  { label: "servers patched / month", value: 17, suffix: "K+" },
  { label: "software teams", value: 25, suffix: "+" },
];

export const expertise: { title: string; body: string; icon: "cube" | "layers" | "spark" | "cloud" }[] = [
  {
    title: "Product Engineering",
    body: "Architect and lead engineering for enterprise products end-to-end — from zero-to-one architecture to adoption at BFSI scale.",
    icon: "cube",
  },
  {
    title: "Solutions Architect",
    body: "Design distributed, event-driven microservices on Kubernetes with Kafka / RabbitMQ pipelines and API gateways handling millions of requests.",
    icon: "layers",
  },
  {
    title: "Agentic AI",
    body: "Embed LLMs into cloud-native platforms — inference endpoints, agentic workflows, RAG over vector stores, and MCP tool integrations.",
    icon: "spark",
  },
  {
    title: "Application & Cloud Modernization",
    body: "Drive cloud modernization for BFSI and NBFC customers — decomposing monoliths, building multi-cloud deployment patterns, and defining reference architectures.",
    icon: "cloud",
  },
];

export const products: Product[] = [
  {
    id: "atlas-api-manager",
    name: "Atlas API Manager",
    tagline: "Cloud-agnostic, enterprise-grade API management — multi-cloud, DC, bare-metal.",
    role: "Tech Lead · Founding Architect",
    lead: "Adopted by 15+ enterprise BFSI / NBFC customers. Competes directly with Kong, Google Apigee, Mulesoft, and AWS API Gateway.",
    highlights: [
      "25+ API policies across security, governance, analytics, transformation, monetization",
      "Deployable on any cloud, data center, or bare-metal",
      "Observability, log management, multi-backend vault (AWS SM / SSM, HashiCorp, OCI, native)",
      "Alert engine (Email / SMS / Webhook / SNS / Teams / Slack) + n8n-style workflow manager",
      "Developer portal, API products, SSO (OIDC / SAML / LDAP), IAM with teams and business groups",
      "Operated by 25+ software teams and 20+ support teams",
    ],
    tech: [
      "Node.js",
      "React.js",
      "Next.js",
      "AWS / GCP / Azure / OCI",
      "Kubernetes",
      "Kafka",
      "Redis",
      "ElasticSearch / OpenSearch",
      "PostgreSQL",
      "Terraform",
      "SAML / OIDC / LDAP",
    ],
    accent: "cyan",
    variant: "api",
  },
  {
    id: "atlas-ai-agent-studio",
    name: "Atlas AI Agent Studio",
    tagline: "No-code agentic AI platform for building, evaluating, and operating LLM agents.",
    role: "Tech Lead · Founding Architect",
    lead: "Used internally for Applied Cloud Computing's AI products and POCs. Adopted by 8 enterprise BFSI / NBFC customers.",
    highlights: [
      "Multi-model: AWS Bedrock, Anthropic, OpenAI, Azure, Gemini, Ollama, Nvidia, Mistral, HuggingFace",
      "Pre-built tools, MCP integrations, prompt manager, guardrails, agent evaluators",
      "Short- and long-term agentic memory with 6 vector store integrations",
      "Knowledge-base manager for RAG over enterprise data",
    ],
    tech: [
      "Node.js",
      "React.js",
      "Next.js",
      "Langchain",
      "Langgraph",
      "Kubernetes",
      "Redis",
      "WebSockets",
      "MCP",
      "PostgreSQL",
      "ElasticSearch / OpenSearch",
    ],
    accent: "violet",
    variant: "agent",
  },
  {
    id: "it-compliance-manager",
    name: "IT Compliance Manager",
    tagline: "End-to-end automation of RBI Cyber KRIs and IT Security Advisories.",
    role: "Tech Lead · Founding Architect",
    lead: "Built for one of India's largest private-sector banks; evolved into a reusable product with an active resale funnel.",
    highlights: [
      "CXO compliance dashboard, rule onboarding, compliance lake explorer",
      "Validation manager, CoPilot, and PlayX — AI-powered Ansible playbook builder",
      "On-demand and scheduled reporting, SSO, automated alerting",
    ],
    tech: [
      "Node.js",
      "React.js",
      "Next.js",
      "S3",
      "S3 Tables",
      "Athena",
      "PostgreSQL",
      "Kubernetes",
      "Ansible",
      "ElasticSearch / OpenSearch",
      "SAML / OIDC / LDAP",
      "Langchain",
      "Langgraph",
      "MCP",
    ],
    accent: "amber",
    variant: "compliance",
  },
  {
    id: "patch-command-center",
    name: "Patch Command Center",
    tagline: "Agentless patching platform for middleware, databases, OS, and network appliances.",
    role: "Tech Lead · Founding Architect",
    lead: "Built for one of India's largest private-sector banks. Productized with an active resale funnel.",
    highlights: [
      "17,000+ servers patched per month across middleware, database, OS, and network appliance layers",
      "Fully agentless mode — no endpoint footprint",
      "AI-driven release risk evaluation",
      "Automated release detection, inventory and service discovery, release lifecycle orchestration",
    ],
    tech: [
      "Node.js",
      "React.js",
      "Next.js",
      "S3",
      "S3 Tables",
      "Athena",
      "PostgreSQL",
      "Kubernetes",
      "Ansible",
      "ElasticSearch / OpenSearch",
      "SAML / OIDC / LDAP",
      "Kafka",
      "Langchain",
      "Langgraph",
      "MCP",
    ],
    accent: "mint",
    variant: "patch",
  },
  {
    id: "atlas-aiops",
    name: "Atlas AIOps",
    tagline: "Prompt-driven autonomous agents replacing manual runbooks.",
    role: "Tech Lead · Founding Architect",
    lead: "Used internally by Applied Cloud Computing's DevOps, Cloud, SRE, and Support teams. Adopted by 2 enterprise banking customers.",
    highlights: [
      "70% MTTR reduction · 90% toil reduction",
      "200+ production-ready agent templates",
      "Observability, CoPilot, no-code automation wizard, HITL, incident management",
      "Connectors: AWS / Azure / GCP / OCI, ServiceNow, PagerDuty, New Relic, Dynatrace, Splunk, ManageEngine, K8s, OpenAPI, MCP, SSH, Shell",
      "AI guardrails, multi-tenant workspaces, SSO",
    ],
    tech: [
      "Node.js",
      "React.js",
      "Next.js",
      "PostgreSQL",
      "Kubernetes",
      "ElasticSearch / OpenSearch",
      "Langchain",
      "Langgraph",
      "MCP",
    ],
    accent: "rose",
    variant: "aiops",
  },
];

export const skills: SkillGroup[] = [
  {
    label: "Architecture",
    items: [
      "Microservices",
      "Event-Driven",
      "Serverless",
      "Service Mesh",
      "Domain-Driven Design",
    ],
  },
  {
    label: "Cloud & Infra",
    items: ["AWS", "OCI", "Docker", "Kubernetes (EKS/OKE)", "Terraform", "Ansible"],
  },
  {
    label: "Backend",
    items: ["Node.js", "Express.js", "TypeScript", "JavaScript", "REST", "WebSockets"],
  },
  {
    label: "Frontend",
    items: ["React", "Next.js", "Tailwind", "ShadCN", "HTML / CSS"],
  },
  {
    label: "Data & Messaging",
    items: [
      "Kafka",
      "RabbitMQ",
      "Redis",
      "PostgreSQL",
      "MySQL",
      "MongoDB",
      "Elasticsearch",
      "OpenSearch",
    ],
  },
  {
    label: "API & Integration",
    items: ["AWS API Gateway", "Google Apigee", "Kong"],
  },
  {
    label: "AI / ML",
    items: [
      "LangchainJS",
      "RAG",
      "Vector DBs",
      "Agentic AI",
      "MCP",
      "AWS Bedrock AgentCore",
      "OpenAI",
      "Anthropic",
      "Gemini",
    ],
  },
  {
    label: "DevOps",
    items: [
      "Git",
      "CI / CD",
      "Observability",
      "Log Management",
      "SSO (OIDC, SAML 2.0, LDAP)",
    ],
  },
];

export const experience: Role[] = [
  {
    company: "Applied Cloud Computing",
    title: "Tech Lead — Product Engineering & Solutions Architecture",
    period: "Sep 2021 – Present",
    highlights: [
      "Architect and lead engineering for multiple enterprise products — API management, agentic AI, IT compliance, patching, and AIOps — now operated by 10+ software and 20+ support teams.",
      "Design distributed, event-driven microservices on Kubernetes (EKS / OKE) with Kafka / RabbitMQ pipelines and API gateways handling millions of requests.",
      "Integrate LLMs into cloud-native platforms: inference endpoints, agentic workflows, RAG over vector stores, MCP tool integrations.",
      "Drive cloud modernization for BFSI and NBFC customers — decomposing monoliths, building multi-cloud deployment patterns, defining reference architectures.",
    ],
  },
  {
    company: "Code B",
    title: "Software Engineer · MERN Stack",
    period: "Oct 2020 – Sep 2021",
    highlights: [
      "Shipped 7+ client projects as a MERN stack developer — MongoDB, Express, React, and Node.js — across web applications and cloud-native services.",
      "Built full-stack features end-to-end: backend REST APIs, third-party integrations, and responsive frontend interfaces deployed to production on AWS.",
      "Collaborated with product and design through the full delivery lifecycle — discovery, architecture, implementation, review, and handover.",
    ],
  },
];

export type NavItemIcon = "tsx" | "md" | "json" | "log" | "dir" | "mdx";

export type NavItem = {
  id: string;
  label: string;
  icon: NavItemIcon;
};

export type NavGroup = {
  id: string;
  label: string;
  href: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    id: "portfolio",
    label: "portfolio/",
    href: "/",
    items: [
      { id: "hero", label: "hero.tsx", icon: "tsx" },
      { id: "stats", label: "stats.tsx", icon: "tsx" },
      { id: "about", label: "about.md", icon: "md" },
      { id: "expertise", label: "expertise.tsx", icon: "tsx" },
      { id: "products", label: "products/", icon: "dir" },
      { id: "skills", label: "skills.json", icon: "json" },
      { id: "experience", label: "experience.log", icon: "log" },
      { id: "contact", label: "contact.tsx", icon: "tsx" },
    ],
  },
  {
    id: "blogs",
    label: "blogs/",
    href: "/blogs",
    items: [],
  },
];
