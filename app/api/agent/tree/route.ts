import { readdirSync, existsSync } from "fs";
import { join } from "path";

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: TreeNode[];
}

const PROJECT_DIR = process.cwd();
const DATA_DIR = join(PROJECT_DIR, "data");
const HERMES_DIR = join(PROJECT_DIR, ".hermes");

function buildTree(dirPath: string, rootPrefix: string): TreeNode[] {
  if (!existsSync(dirPath)) return [];

  const entries = readdirSync(dirPath, { withFileTypes: true })
    .filter((e) => !e.name.startsWith(".") && !e.name.startsWith("_"))
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

  return entries.map((entry) => {
    const fullPath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      return {
        name: entry.name,
        path: `${rootPrefix}/${entry.name}`,
        type: "directory" as const,
        children: buildTree(fullPath, `${rootPrefix}/${entry.name}`),
      };
    }

    return {
      name: entry.name,
      path: `${rootPrefix}/${entry.name}`,
      type: "file" as const,
    };
  });
}

function buildHermesTree(): TreeNode[] {
  const nodes: TreeNode[] = [];

  // Agents
  const agentsDir = join(HERMES_DIR, "agents");
  if (existsSync(agentsDir)) {
    const agentFiles = readdirSync(agentsDir).filter((f) => !f.startsWith("."));
    if (agentFiles.length > 0) {
      nodes.push({
        name: "agents",
        path: ".hermes/agents",
        type: "directory",
        children: agentFiles.map((f) => ({
          name: f,
          path: `.hermes/agents/${f}`,
          type: "file" as const,
        })),
      });
    }
  }

  // Skill bundles
  const bundlesDir = join(HERMES_DIR, "skill-bundles");
  if (existsSync(bundlesDir)) {
    const bundleFiles = readdirSync(bundlesDir).filter((f) => !f.startsWith("."));
    if (bundleFiles.length > 0) {
      nodes.push({
        name: "skill-bundles",
        path: ".hermes/skill-bundles",
        type: "directory",
        children: bundleFiles.map((f) => ({
          name: f,
          path: `.hermes/skill-bundles/${f}`,
          type: "file" as const,
        })),
      });
    }
  }

  // Skills (recursive tree under mental-health/)
  const skillsDir = join(HERMES_DIR, "skills", "mental-health");
  if (existsSync(skillsDir)) {
    nodes.push({
      name: "skills/mental-health",
      path: ".hermes/skills/mental-health",
      type: "directory",
      children: buildTree(skillsDir, ".hermes/skills/mental-health"),
    });
  }

  return nodes;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const patientId = url.searchParams.get("patientId");

    if (patientId) {
      if (!/^[a-zA-Z0-9_-]+$/.test(patientId)) {
        return Response.json({ error: "Invalid patient ID" }, { status: 400 });
      }

      const patientDir = join(DATA_DIR, "patients", patientId);
      if (!existsSync(patientDir)) {
        return Response.json({ error: "Patient not found" }, { status: 404 });
      }

      const dataNodes: TreeNode[] = [
        {
          name: patientId,
          path: `data/patients/${patientId}`,
          type: "directory",
          children: buildTree(patientDir, `data/patients/${patientId}`),
        },
      ];

      const hermesNodes = buildHermesTree();
      return Response.json({ tree: [...dataNodes, ...hermesNodes] });
    }

    // Dashboard context
    const dataNode: TreeNode = {
      name: "data",
      path: "data",
      type: "directory",
      children: buildTree(DATA_DIR, "data"),
    };

    const hermesNodes = buildHermesTree();
    return Response.json({ tree: [dataNode, ...hermesNodes] });
  } catch (error) {
    console.error("[agent/tree]", error);
    return Response.json({ error: "Failed to read filesystem" }, { status: 500 });
  }
}