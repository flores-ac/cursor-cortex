const { readFileSync, readdirSync, existsSync, statSync } = require('fs');
const { join } = require('path');
const { homedir } = require('os');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CORTEX_ROOT = join(homedir(), '.cursor-cortex');
const PORT = 4000;

const TIMEOUT = {
  PIPELINE_CONTEXT: 60_000,
  SEMANTIC_SEARCH: 120_000,
};

// ---------------------------------------------------------------------------
// GraphQL Schema
// ---------------------------------------------------------------------------

const typeDefs = `#graphql
  enum PipelineStatus {
    ACTIVE
    DEPRECATED
  }

  enum PipelineSortBy {
    NAME
    PROJECT_NAME
    LAST_UPDATED
  }

  enum ConnectionDirection {
    BIDIRECTIONAL
    UPSTREAM
    DOWNSTREAM
  }

  type BranchEntry {
    timestamp: String!
    content: String!
  }

  type BranchCompleteness {
    score: Float!
    category: String!
  }

  type Branch {
    name: String!
    completeness: BranchCompleteness
    entries(last: Int, first: Int): [BranchEntry!]!
  }

  type ProjectStats {
    averageCompletenessScore: Float
    totalBranches: Int!
    totalBranchEntries: Int!
  }

  type Project {
    name: String!
    description: String
    stats: ProjectStats
    branches(name: String): [Branch!]!
    relatedProjects: [String!]!
  }

  type TacitKnowledge {
    title: String
    dateCreated: String
    author: String
    project: String
    tags: [String]
    content: String
  }

  type SearchResults {
    knowledge: [TacitKnowledge]
    branches: [Branch]
    totalResults: Int
  }

  type PipelineStage {
    number: Int!
    name: String!
    description: String
    tables: [String]
  }

  type Pipeline {
    id: String!
    name: String!
    projectName: String!
    description: String
    status: PipelineStatus!
    stages: [PipelineStage!]!
    lastUpdated: String
  }

  type PipelineConnection {
    fromPipeline: Pipeline!
    toPipeline: Pipeline!
    direction: ConnectionDirection!
    viaProject: String
  }

  type ContextFile {
    name: String!
    projectName: String!
    title: String
    description: String
    lastUpdated: String
    branch: String
  }

  type GraphNode {
    id: String!
    label: String!
    type: String!
    properties: String
  }

  type GraphRelationship {
    source: String!
    target: String!
    type: String!
    weight: Float
  }

  type GraphCluster {
    id: String!
    label: String!
    nodes: [GraphNode!]!
    relationships: [GraphRelationship!]!
  }

  type ProjectConnection {
    project: Project!
    depth: Int!
    via: String
  }

  type Query {
    projects: [Project!]!
    project(name: String!): Project
    projectGraph(name: String!, maxDepth: Int): [ProjectConnection!]!
    searchKnowledge(query: String!, semanticSearch: Boolean): SearchResults
    pipelines(sortBy: PipelineSortBy): [Pipeline!]!
    pipeline(id: String!): Pipeline
    pipelineConnections(pipelineId: String!): [PipelineConnection!]!
    contextFiles(projectName: String): [ContextFile!]!
  }
`;

// ---------------------------------------------------------------------------
// CortexAPI – reads directly from ~/.cursor-cortex/ filesystem
// ---------------------------------------------------------------------------

class CortexAPI {
  constructor(rootDir = CORTEX_ROOT) {
    this.rootDir = rootDir;
    this.branchNotesDir = join(rootDir, 'branch_notes');
    this.contextDir = join(rootDir, 'context');
    this.knowledgeDir = join(rootDir, 'knowledge');
  }

  // ---- helpers -----------------------------------------------------------

  safeDirRead(dir) {
    try {
      if (!existsSync(dir)) return [];
      return readdirSync(dir);
    } catch (err) {
      console.error(`[CortexAPI] Failed to read directory ${dir}:`, err.message);
      return [];
    }
  }

  safeFileRead(filePath) {
    try {
      if (!existsSync(filePath)) return null;
      return readFileSync(filePath, 'utf-8');
    } catch (err) {
      console.error(`[CortexAPI] Failed to read file ${filePath}:`, err.message);
      return null;
    }
  }

  isDirectory(p) {
    try {
      return existsSync(p) && statSync(p).isDirectory();
    } catch {
      return false;
    }
  }

  // ---- projects ----------------------------------------------------------

  listProjects() {
    const projects = this.safeDirRead(this.branchNotesDir);
    return projects.filter((p) => this.isDirectory(join(this.branchNotesDir, p)));
  }

  getProjectDescription(projectName) {
    const contextPath = join(this.contextDir, projectName, 'project_context.md');
    const content = this.safeFileRead(contextPath);
    if (!content) return null;

    const descMatch = content.match(/## Description\s*\n([\s\S]*?)(?=\n## |\n---|\n\*|$)/);
    return descMatch ? descMatch[1].trim() : null;
  }

  getRelatedProjects(projectName) {
    const contextPath = join(this.contextDir, projectName, 'project_context.md');
    const content = this.safeFileRead(contextPath);
    if (!content) return [];

    const section = content.match(/## Related Projects\s*\n([\s\S]*?)(?=\n## |\n---|\n\*\*|$)/);
    if (!section) return [];

    return section[1]
      .split('\n')
      .map((line) => line.replace(/^[-*\s]+/, '').trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));
  }

  // ---- branches ----------------------------------------------------------

  listBranches(projectName) {
    const branchDir = join(this.branchNotesDir, projectName);
    return this.safeDirRead(branchDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace(/\.md$/, ''));
  }

  getBranchNotes(projectName, branchName) {
    const filePath = join(this.branchNotesDir, projectName, `${branchName}.md`);
    const content = this.safeFileRead(filePath);
    if (!content) return [];

    return this.parseBranchEntries(content);
  }

  parseBranchEntries(content) {
    const entries = [];
    const sections = content.split(/^## /m).filter(Boolean);

    for (const section of sections) {
      const lines = section.split('\n');
      const firstLine = lines[0].trim();

      const tsMatch = firstLine.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
      if (!tsMatch) continue;

      const timestamp = tsMatch[1];
      const body = lines.slice(1).join('\n').trim();
      if (body) {
        entries.push({ timestamp, content: body });
      }
    }
    return entries;
  }

  computeBranchCompleteness(entries) {
    if (!entries.length) return { score: 0, category: 'Empty' };

    let score = 0;
    const totalContent = entries.map((e) => e.content).join(' ');

    if (entries.length >= 1) score += 20;
    if (entries.length >= 3) score += 15;
    if (entries.length >= 5) score += 10;
    if (totalContent.length > 500) score += 15;
    if (totalContent.length > 2000) score += 10;
    if (/(?:fix|resolve|implement|complete|done)/i.test(totalContent)) score += 15;
    if (/(?:test|verify|validate)/i.test(totalContent)) score += 10;
    if (entries.length >= 2) {
      const first = new Date(entries[0].timestamp);
      const last = new Date(entries[entries.length - 1].timestamp);
      if (last - first > 3600000) score += 5;
    }

    score = Math.min(score, 100);

    let category;
    if (score >= 80) category = 'Comprehensive';
    else if (score >= 60) category = 'Good';
    else if (score >= 40) category = 'Moderate';
    else if (score >= 20) category = 'Minimal';
    else category = 'Empty';

    return { score, category };
  }

  // ---- knowledge (tacit) ------------------------------------------------

  listKnowledgeFiles(projectName) {
    const dir = projectName
      ? join(this.knowledgeDir, projectName)
      : this.knowledgeDir;
    if (!this.isDirectory(dir)) return [];

    if (projectName) {
      return this.safeDirRead(dir)
        .filter((f) => f.endsWith('.md'))
        .map((f) => join(dir, f));
    }

    const files = [];
    for (const proj of this.safeDirRead(dir)) {
      const projDir = join(dir, proj);
      if (!this.isDirectory(projDir)) continue;
      for (const f of this.safeDirRead(projDir)) {
        if (f.endsWith('.md')) files.push(join(projDir, f));
      }
    }
    return files;
  }

  parseKnowledgeFile(filePath) {
    const content = this.safeFileRead(filePath);
    if (!content) return null;

    const extract = (pattern) => {
      const m = content.match(pattern);
      return m ? m[1].trim() : null;
    };

    const tagsRaw = extract(/\*\*Tags?:\*\*\s*(.*)/i);
    const tags = tagsRaw
      ? tagsRaw.split(/[,;]/).map((t) => t.trim()).filter(Boolean)
      : [];

    const projectFromPath = filePath.split('/').slice(-2, -1)[0] || null;

    return {
      title: extract(/\*\*Title:\*\*\s*(.*)/),
      dateCreated: extract(/\*\*Date Captured:\*\*\s*(.*)/),
      author: extract(/\*\*Author:\*\*\s*(.*)/),
      project: extract(/\*\*Project:\*\*\s*(.*)/) || projectFromPath,
      tags,
      content,
    };
  }

  // ---- search ------------------------------------------------------------

  searchKnowledge(query, semanticSearch = false) {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = { knowledge: [], branches: [] };

    const knowledgeFiles = this.listKnowledgeFiles();
    for (const fp of knowledgeFiles) {
      const parsed = this.parseKnowledgeFile(fp);
      if (!parsed) continue;
      const blob = (parsed.content || '').toLowerCase();
      if (terms.some((t) => blob.includes(t))) {
        matches.knowledge.push(parsed);
      }
    }

    for (const proj of this.listProjects()) {
      for (const branch of this.listBranches(proj)) {
        const entries = this.getBranchNotes(proj, branch);
        const branchBlob = entries.map((e) => e.content).join(' ').toLowerCase();
        if (terms.some((t) => branchBlob.includes(t))) {
          matches.branches.push({
            name: branch,
            entries,
            completeness: this.computeBranchCompleteness(entries),
          });
        }
      }
    }

    return {
      knowledge: matches.knowledge,
      branches: matches.branches,
      totalResults: matches.knowledge.length + matches.branches.length,
    };
  }

  // ---- context files -----------------------------------------------------

  listContextFiles(projectName) {
    const results = [];
    const projects = projectName ? [projectName] : this.safeDirRead(this.contextDir);

    for (const proj of projects) {
      const projDir = join(this.contextDir, proj);
      if (!this.isDirectory(projDir)) continue;

      for (const file of this.safeDirRead(projDir)) {
        if (!file.endsWith('.md')) continue;
        const content = this.safeFileRead(join(projDir, file));
        const cf = this.parseContextFile(content, file, proj);
        if (cf) results.push(cf);
      }
    }
    return results;
  }

  parseContextFile(content, fileName, projectName) {
    if (!content) return null;

    const extract = (pattern) => {
      const m = content.match(pattern);
      return m ? m[1].trim() : null;
    };

    const titleMatch = content.match(/^#\s+(.+)/m);
    const descMatch = content.match(/## Description\s*\n([\s\S]*?)(?=\n## |\n---|\n\*|$)/);

    return {
      name: fileName.replace(/_context\.md$/, '').replace(/\.md$/, ''),
      projectName,
      title: titleMatch ? titleMatch[1].trim() : fileName,
      description: descMatch ? descMatch[1].trim() : null,
      lastUpdated: extract(/Last Updated:\s*(.*)/),
      branch: extract(/Branch:\s*(.*)/),
    };
  }

  // ---- pipelines ---------------------------------------------------------

  listPipelineContexts() {
    const pipelines = [];
    const seenPipelineIds = new Set();
    const projects = this.safeDirRead(this.contextDir);

    for (const proj of projects) {
      const projDir = join(this.contextDir, proj);
      if (!this.isDirectory(projDir)) continue;

      for (const file of this.safeDirRead(projDir)) {
        if (!file.startsWith('pipeline_') || !file.endsWith('.md')) continue;

        const content = this.safeFileRead(join(projDir, file));
        if (!content) continue;

        const pipelineId = file
          .replace(/^pipeline_/, '')
          .replace(/_context\.md$/, '')
          .replace(/\.md$/, '');

        if (seenPipelineIds.has(pipelineId)) continue;
        seenPipelineIds.add(pipelineId);

        pipelines.push(this.parsePipelineContext(content, pipelineId, proj));
      }
    }
    return pipelines;
  }

  readPipelineContext(pipelineId) {
    const projects = this.safeDirRead(this.contextDir);
    for (const proj of projects) {
      const projDir = join(this.contextDir, proj);
      if (!this.isDirectory(projDir)) continue;

      const candidates = [
        `pipeline_${pipelineId}_context.md`,
        `pipeline_${pipelineId}.md`,
      ];
      for (const cand of candidates) {
        const fp = join(projDir, cand);
        const content = this.safeFileRead(fp);
        if (content) {
          return this.parsePipelineContext(content, pipelineId, proj);
        }
      }
    }
    return null;
  }

  parsePipelineContext(content, pipelineId, projectName) {
    const titleMatch = content.match(/^#\s+(.+)/m);
    const descMatch = content.match(/## Description\s*\n([\s\S]*?)(?=\n## |\n---|\n\*|$)/);
    const lastUpdatedMatch = content.match(/Last Updated:\s*(.*)/);

    const isDeprecated =
      /DEPRECATED/i.test(content.slice(0, 500)) ||
      /status:\s*deprecated/i.test(content);

    const stages = this.parseStages(content);

    return {
      id: pipelineId,
      name: titleMatch ? titleMatch[1].trim() : pipelineId,
      projectName,
      description: descMatch ? descMatch[1].trim() : null,
      status: isDeprecated ? 'DEPRECATED' : 'ACTIVE',
      stages,
      lastUpdated: lastUpdatedMatch ? lastUpdatedMatch[1].trim() : null,
    };
  }

  parseStages(content) {
    const stages = [];

    // Pattern 1: ### **STAGE NN: Name**
    const stageRegex = /###\s+\*{0,2}(?:STAGE|Stage|Step)\s*(\d+)(?:[:\s-]+)(.+?)\*{0,2}\s*\n([\s\S]*?)(?=###\s+\*{0,2}(?:STAGE|Stage|Step)\s*\d+|## [^#]|$)/gi;
    let match;
    while ((match = stageRegex.exec(content)) !== null) {
      const number = parseInt(match[1], 10);
      const name = match[2].replace(/\*+/g, '').trim();
      const body = match[3].trim();
      const tables = this.extractTables(body);
      stages.push({ number, name, description: this.summarizeBody(body), tables });
    }

    if (stages.length) return stages;

    // Pattern 2: numbered list items like "1. **Name** - description" or "1. Name:"
    const numberedRegex = /^(\d+)\.\s+\*{0,2}(.+?)\*{0,2}(?:\s*[-–:]\s*)([\s\S]*?)(?=^\d+\.\s|\n## |\n---|$)/gm;
    while ((match = numberedRegex.exec(content)) !== null) {
      const number = parseInt(match[1], 10);
      const name = match[2].replace(/\*+/g, '').trim();
      const body = match[3].trim();
      const tables = this.extractTables(body);
      stages.push({ number, name, description: this.summarizeBody(body), tables });
    }

    return stages;
  }

  extractTables(text) {
    const tables = new Set();

    // Backticked table references
    const backtickMatches = text.matchAll(/`([a-zA-Z_][a-zA-Z0-9_.]+)`/g);
    for (const m of backtickMatches) {
      const val = m[1];
      if (val.includes('_') || val.includes('.')) {
        tables.add(val);
      }
    }

    // Output/table patterns like "Output: table_name" or "**Output:** table_name"
    const outputMatches = text.matchAll(/(?:Output|Table|Creates?|Produces?):\s*\*{0,2}\s*([a-zA-Z_][a-zA-Z0-9_.]+)/gi);
    for (const m of outputMatches) {
      tables.add(m[1]);
    }

    // BRONZE_, SILVER_, GOLD_ prefixed table names
    const tierMatches = text.matchAll(/\b((?:BRONZE|SILVER|GOLD|bronze|silver|gold)_[a-zA-Z0-9_]+)/g);
    for (const m of tierMatches) {
      tables.add(m[1]);
    }

    return [...tables];
  }

  summarizeBody(text) {
    const lines = text.split('\n').filter((l) => l.trim());
    const meaningful = lines
      .map((l) => l.replace(/^[-*]\s+/, '').replace(/\*+/g, '').trim())
      .filter((l) => l.length > 0);
    return meaningful.slice(0, 3).join('. ') || null;
  }

  // ---- pipeline connections ----------------------------------------------

  getPipelineConnections(pipelineId) {
    const allPipelines = this.listPipelineContexts();
    const target = allPipelines.find((p) => p.id === pipelineId);
    if (!target) return [];

    const projectToPipelines = new Map();
    for (const p of allPipelines) {
      if (!projectToPipelines.has(p.projectName)) {
        projectToPipelines.set(p.projectName, []);
      }
      projectToPipelines.get(p.projectName).push(p);
    }

    const connections = [];
    const targetContent = this.readPipelineRawContent(pipelineId);
    const depMatch = targetContent
      ? targetContent.match(/## Dependencies\s*\n([\s\S]*?)(?=\n## |\n---|\n\*|$)/)
      : null;
    const deps = depMatch
      ? depMatch[1].split(/[,\n]/).map((d) => d.replace(/^[-*\s]+/, '').trim()).filter(Boolean)
      : [];

    for (const other of allPipelines) {
      if (other.id === pipelineId) continue;

      const otherDeps = this.getPipelineDependencies(other.id);
      const isUpstream = deps.some((d) =>
        other.name.toLowerCase().includes(d.toLowerCase()) ||
        other.id.toLowerCase().includes(d.toLowerCase())
      );
      const isDownstream = otherDeps.some((d) =>
        target.name.toLowerCase().includes(d.toLowerCase()) ||
        target.id.toLowerCase().includes(d.toLowerCase())
      );

      if (isUpstream && isDownstream) {
        connections.push({
          fromPipeline: target,
          toPipeline: other,
          direction: 'BIDIRECTIONAL',
          viaProject: other.projectName,
        });
      } else if (isUpstream) {
        connections.push({
          fromPipeline: other,
          toPipeline: target,
          direction: 'UPSTREAM',
          viaProject: other.projectName,
        });
      } else if (isDownstream) {
        connections.push({
          fromPipeline: target,
          toPipeline: other,
          direction: 'DOWNSTREAM',
          viaProject: other.projectName,
        });
      }
    }

    return connections;
  }

  readPipelineRawContent(pipelineId) {
    const projects = this.safeDirRead(this.contextDir);
    for (const proj of projects) {
      const projDir = join(this.contextDir, proj);
      if (!this.isDirectory(projDir)) continue;
      for (const cand of [`pipeline_${pipelineId}_context.md`, `pipeline_${pipelineId}.md`]) {
        const content = this.safeFileRead(join(projDir, cand));
        if (content) return content;
      }
    }
    return null;
  }

  getPipelineDependencies(pipelineId) {
    const content = this.readPipelineRawContent(pipelineId);
    if (!content) return [];
    const depMatch = content.match(/## Dependencies\s*\n([\s\S]*?)(?=\n## |\n---|\n\*|$)/);
    if (!depMatch) return [];
    return depMatch[1].split(/[,\n]/).map((d) => d.replace(/^[-*\s]+/, '').trim()).filter(Boolean);
  }
}

// ---------------------------------------------------------------------------
// Resolvers
// ---------------------------------------------------------------------------

function buildResolvers(api) {
  return {
    Query: {
      projects() {
        const projectNames = api.listProjects();
        return projectNames.map((name) => buildProject(api, name));
      },

      project(_, { name }) {
        const exists = api.listProjects().includes(name);
        if (!exists) return null;
        return buildProject(api, name);
      },

      projectGraph(_, { name, maxDepth }) {
        const depth = maxDepth || 2;
        const allProjects = api.listProjects();

        const outEdges = new Map();
        const inEdges = new Map();
        for (const pName of allProjects) {
          const related = api.getRelatedProjects(pName);
          outEdges.set(pName, related);
          for (const rel of related) {
            if (!inEdges.has(rel)) inEdges.set(rel, []);
            inEdges.get(rel).push(pName);
          }
        }

        const visited = new Map();
        const queue = [{ node: name, d: 0, via: null }];

        while (queue.length > 0) {
          const { node, d, via } = queue.shift();
          if (visited.has(node)) continue;
          visited.set(node, { depth: d, via });
          if (d >= depth) continue;

          const neighbors = new Set([
            ...(outEdges.get(node) || []),
            ...(inEdges.get(node) || []),
          ]);
          for (const nb of neighbors) {
            if (!visited.has(nb) && allProjects.includes(nb)) {
              queue.push({ node: nb, d: d + 1, via: node });
            }
          }
        }

        visited.delete(name);

        return [...visited.entries()].map(([pName, info]) => ({
          project: buildProject(api, pName),
          depth: info.depth,
          via: info.via,
        }));
      },

      searchKnowledge(_, { query, semanticSearch }) {
        return api.searchKnowledge(query, semanticSearch);
      },

      pipelines(_, { sortBy }) {
        let list = api.listPipelineContexts();

        if (sortBy === 'NAME') {
          list.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === 'PROJECT_NAME') {
          list.sort((a, b) => a.projectName.localeCompare(b.projectName));
        } else if (sortBy === 'LAST_UPDATED') {
          list.sort((a, b) => {
            const da = a.lastUpdated ? new Date(a.lastUpdated) : new Date(0);
            const db = b.lastUpdated ? new Date(b.lastUpdated) : new Date(0);
            return db - da;
          });
        }

        return list;
      },

      pipeline(_, { id }) {
        return api.readPipelineContext(id);
      },

      pipelineConnections(_, { pipelineId }) {
        return api.getPipelineConnections(pipelineId);
      },

      contextFiles(_, { projectName }) {
        return api.listContextFiles(projectName);
      },
    },

    Project: {
      branches(project, { name }) {
        if (name) {
          return project.branches.filter((b) => b.name === name);
        }
        return project.branches;
      },
    },

    Branch: {
      entries(branch, { last, first }) {
        let result = branch.entries;
        if (last) result = result.slice(-last);
        else if (first) result = result.slice(0, first);
        return result;
      },
    },
  };
}

function buildProject(api, name) {
  const description = api.getProjectDescription(name);
  const branchNames = api.listBranches(name);

  const branches = branchNames.map((bName) => {
    const entries = api.getBranchNotes(name, bName);
    return {
      name: bName,
      entries,
      completeness: api.computeBranchCompleteness(entries),
    };
  });

  const totalBranchEntries = branches.reduce((sum, b) => sum + b.entries.length, 0);
  const scores = branches.map((b) => b.completeness.score);
  const averageCompletenessScore = scores.length
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 0;

  return {
    name,
    description,
    stats: {
      averageCompletenessScore: Math.round(averageCompletenessScore * 100) / 100,
      totalBranches: branches.length,
      totalBranchEntries,
    },
    branches,
    relatedProjects: api.getRelatedProjects(name),
  };
}

// ---------------------------------------------------------------------------
// Server bootstrap
// ---------------------------------------------------------------------------

async function startServer() {
  // Dynamic imports for ESM-only packages (@apollo/server v4 is ESM)
  const { ApolloServer } = await import('@apollo/server');
  const { expressMiddleware } = await import('@apollo/server/express4');
  const { ApolloServerPluginLandingPageLocalDefault } = await import(
    '@apollo/server/plugin/landingPage/default'
  );
  const express = (await import('express')).default;
  const cors = (await import('cors')).default;

  const api = new CortexAPI();

  const server = new ApolloServer({
    typeDefs,
    resolvers: buildResolvers(api),
    introspection: true,
    plugins: [ApolloServerPluginLandingPageLocalDefault({ embed: true })],
  });

  await server.start();

  const app = express();
  app.use(cors());

  // Serve context-explorer.html at root
  const explorerPath = join(__dirname, 'context-explorer.html');
  app.get('/', (_req, res) => {
    res.sendFile(explorerPath);
  });

  app.use(
    '/graphql',
    express.json(),
    expressMiddleware(server, {
      context: async () => ({ api }),
    }),
  );

  await new Promise((resolve) => {
    app.listen(PORT, () => {
      console.log(`\n  Cursor-Cortex GraphQL Server ready`);
      console.log(`  Endpoint:   http://localhost:${PORT}/graphql`);
      console.log(`  Explorer:   http://localhost:${PORT}/`);
      console.log(`  Cortex dir: ${CORTEX_ROOT}\n`);

      const projects = api.listProjects();
      const pipelines = api.listPipelineContexts();
      console.log(`  Discovered ${projects.length} projects, ${pipelines.length} pipelines\n`);
      resolve();
    });
  });
}

startServer().catch((err) => {
  console.error('Failed to start GraphQL server:', err);
  process.exit(1);
});
