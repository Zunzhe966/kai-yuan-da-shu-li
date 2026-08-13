import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { projectFixture } from "../test/factories";
import type { ProjectPublication } from "../src/domain/project";
import {
  renderCatalogPage,
  renderProjectPage,
} from "../src/ui/public-pages";
import { renderLayout } from "../src/ui/layout";
import type { SearchInput } from "../src/services/search";

const ROOT = join(import.meta.dirname, "..");
const OUT = join(ROOT, "build", "preview");

function makeProject(
  id: string,
  name: string,
  chineseName: string,
  category: string,
  summary: string,
  useWhen: string,
  avoidWhen: string,
  tags: { domains: string[]; capabilities: string[]; types: string[]; languages: string[]; licenses: string[] },
  creatorId: string,
  fullName: string,
  canonicalUrl: string,
  creatorName: string,
): ProjectPublication {
  const project = projectFixture({
    projectId: id,
    repositoryId: `${id}-repo`,
    status: "published",
  });
  const source = project.repository_sources[0];
  const evidence = project.evidence[0];
  if (!source || !evidence) {
    throw new Error(`fixture for ${id} is missing repository source or evidence`);
  }
  project.repository_sources = [
    {
      ...source,
      platform_repository_id: `${id}-repo`,
      canonical_url: canonicalUrl,
      full_name: fullName,
    },
  ];
  project.card = {
    ...project.card,
    name,
    chinese_name: chineseName,
    primary_category: category,
    summary,
    use_when: useWhen,
    avoid_when: avoidWhen,
    primary_language: tags.languages[0] ?? null,
    license: tags.licenses[0] ?? null,
    primary_creator: creatorName,
  };
  project.identity = {
    ...project.identity,
    name,
    chinese_name: chineseName,
  };
  project.discovery = {
    ...project.discovery,
    domains: tags.domains,
    capabilities: tags.capabilities,
    project_types: tags.types,
    languages: tags.languages,
    licenses: tags.licenses,
  };
  project.attribution = [
    { creator_id: creatorId, role: "creator", evidence_ids: ["repo-readme"] },
  ];
  project.evidence = [
    {
      evidence_id: "repo-readme",
      url: canonicalUrl,
      source_type: "repository_readme",
      retrieved_at: evidence.retrieved_at,
      supports: ["card.summary"],
      fact_summary: `${fullName} README`,
      applicable_version: null,
      content_hash: null,
    },
  ];
  return project;
}

const projects = [
  makeProject(
    "project-aider",
    "Aider",
    "Aider AI 编程助手",
    "AI 编程",
    "终端里的 AI 结对编程，直接修改 git 仓库并自动提交。",
    "命令行驱动、以 git 为中心的编码 Agent",
    "要 IDE 内嵌体验为主",
    {
      domains: ["ai-agents", "devtools"],
      capabilities: ["coding", "pair", "cli", "git"],
      types: ["cli", "agent"],
      languages: ["Python"],
      licenses: ["Apache-2.0"],
    },
    "creator-aider",
    "Aider-AI/aider",
    "https://github.com/Aider-AI/aider",
    "Aider 团队",
  ),
  makeProject(
    "project-ollama",
    "Ollama",
    "Ollama 本地模型运行器",
    "本地推理",
    "一条命令在本机跑大模型，支持拉取、运行和管理模型。",
    "本机离线运行、隐私优先、快速体验开源模型",
    "需要多用户服务或生产级推理集群",
    {
      domains: ["ai-agents"],
      capabilities: ["local-llm", "inference", "cli"],
      types: ["runtime", "cli"],
      languages: ["Go"],
      licenses: ["MIT"],
    },
    "creator-ollama",
    "ollama/ollama",
    "https://github.com/ollama/ollama",
    "Ollama 团队",
  ),
  makeProject(
    "project-fastapi",
    "FastAPI",
    "FastAPI 后端框架",
    "后端与 API",
    "高性能 Python API 框架，自动生成 OpenAPI 文档。",
    "快速构建异步 API、需要自动文档与类型校验",
    "团队强依赖 Django 全家桶或需要 Java 生态",
    {
      domains: ["backend"],
      capabilities: ["api", "async", "openapi"],
      types: ["framework"],
      languages: ["Python"],
      licenses: ["MIT"],
    },
    "creator-fastapi",
    "fastapi/fastapi",
    "https://github.com/fastapi/fastapi",
    "FastAPI 团队",
  ),
  makeProject(
    "project-langchain",
    "LangChain",
    "LangChain 应用框架",
    "Agent 框架",
    "把模型、工具、记忆和外部数据串成应用流程。",
    "需要编排多步 Agent 流程、连接工具与知识库",
    "只需要单次简单调用时，框架反而更重",
    {
      domains: ["ai-agents"],
      capabilities: ["agent", "rag", "tool-use"],
      types: ["framework"],
      languages: ["Python", "JavaScript"],
      licenses: ["MIT"],
    },
    "creator-langchain",
    "langchain-ai/langchain",
    "https://github.com/langchain-ai/langchain",
    "LangChain 团队",
  ),
  makeProject(
    "project-dify",
    "Dify",
    "Dify AI 应用平台",
    "AI 应用平台",
    "可视化搭建 AI 应用，内置工作流、RAG 与模型管理。",
    "非技术团队快速搭建 AI 应用、需要后台界面",
    "深度定制底层编排或完全离线部署",
    {
      domains: ["ai-agents"],
      capabilities: ["workflow", "rag", "app-platform"],
      types: ["platform"],
      languages: ["TypeScript", "Python"],
      licenses: ["Apache-2.0"],
    },
    "creator-dify",
    "langgenius/dify",
    "https://github.com/langgenius/dify",
    "Dify 团队",
  ),
  makeProject(
    "project-comfyui",
    "ComfyUI",
    "ComfyUI 节点式图像生成",
    "AI 图像工具",
    "节点式 Stable Diffusion 工作流，适合精细控制生成过程。",
    "需要节点式图像工作流、可复现生成参数",
    "只需要简单一键生成图片",
    {
      domains: ["ai-agents", "media"],
      capabilities: ["image", "workflow", "stable-diffusion"],
      types: ["app", "tool"],
      languages: ["Python"],
      licenses: ["GPL-3.0"],
    },
    "creator-comfyui",
    "comfyanonymous/ComfyUI",
    "https://github.com/comfyanonymous/ComfyUI",
    "ComfyUI 团队",
  ),
];

mkdirSync(OUT, { recursive: true });
cpSync(join(ROOT, "public"), OUT, { recursive: true });

const input: SearchInput = {
  query: "",
  entityType: "all",
  sort: "name",
};
const catalogHtml = renderCatalogPage(
  {
    total: projects.length,
    items: projects,
    nextCursor: null,
  },
  input,
);

writeFileSync(join(OUT, "index.html"), catalogHtml, "utf-8");

for (const project of projects) {
  const dir = join(OUT, "projects", project.project_id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "index.html"),
    renderProjectPage(project, {
      knownCreatorIds: new Set(
        projects.map((item) => item.attribution[0]?.creator_id).filter((id): id is string => Boolean(id)),
      ),
    }),
    "utf-8",
  );
}

for (const project of projects) {
  const creatorId = project.attribution[0]?.creator_id;
  if (!creatorId) continue;
  const creatorName = project.card.primary_creator ?? creatorId;
  const dir = join(OUT, "creators", creatorId);
  mkdirSync(dir, { recursive: true });
  const content = `<main class="creator-page" id="main-content">
    <nav class="breadcrumbs" aria-label="面包屑"><a href="/?entity=creator">作者与组织</a><span>/</span><span>${creatorName}</span></nav>
    <header class="creator-hero">
      <div>
        <p class="section-kicker">人物</p>
        <h1>${creatorName}</h1>
        <p class="project-deck">${creatorName}：${project.card.summary}</p>
      </div>
    </header>
    <section class="creator-projects" aria-labelledby="curated-heading">
      <div class="section-heading"><h2 id="curated-heading">本站精选项目</h2><span>1 个</span></div>
      <div class="creator-project-list">
        <article class="creator-project-item"><a class="primary-button" href="/projects/${project.project_id}/">查看项目</a></article>
      </div>
    </section>
  </main>`;
  writeFileSync(
    join(dir, "index.html"),
    renderLayout({
      title: creatorName,
      description: `${creatorName} 的项目与公开身份资料。`,
      content,
      canonicalPath: `/creators/${creatorId}`,
      bodyClass: "creator-body",
      humanAdSlots: true,
    }),
    "utf-8",
  );
}

console.log(`preview written to ${OUT}`);
