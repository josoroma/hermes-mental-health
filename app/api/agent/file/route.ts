import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, resolve } from "path";

const PROJECT_DIR = resolve(process.cwd());

function safePath(requestedPath: string): string {
  const absolute = resolve(join(PROJECT_DIR, requestedPath));
  if (!absolute.startsWith(PROJECT_DIR + "/") && absolute !== PROJECT_DIR) {
    throw new Error("Path traversal blocked");
  }
  return absolute;
}

function isAllowedFile(filePath: string): boolean {
  const allowedExtensions = [".md", ".json", ".yaml", ".yml", ".txt", ".css", ".ts", ".tsx", ".js", ".jsx"];
  return allowedExtensions.some((ext) => filePath.endsWith(ext));
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filePath = url.searchParams.get("path");

    if (!filePath) {
      return Response.json({ error: "path is required" }, { status: 400 });
    }

    const absolute = safePath(filePath);

    if (!existsSync(absolute)) {
      return Response.json({ error: "File not found" }, { status: 404 });
    }

    if (!isAllowedFile(absolute)) {
      return Response.json({ error: "File type not allowed" }, { status: 403 });
    }

    const content = readFileSync(absolute, "utf-8");
    return Response.json({ path: filePath, content });
  } catch (error) {
    console.error("[agent/file GET]", error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const filePath = url.searchParams.get("path");

    if (!filePath) {
      return Response.json({ error: "path is required" }, { status: 400 });
    }

    const { content } = await request.json();
    if (typeof content !== "string") {
      return Response.json({ error: "content must be a string" }, { status: 400 });
    }

    const absolute = safePath(filePath);

    if (!existsSync(absolute)) {
      return Response.json({ error: "File not found" }, { status: 404 });
    }

    if (!isAllowedFile(absolute)) {
      return Response.json({ error: "File type not allowed" }, { status: 403 });
    }

    writeFileSync(absolute, content, "utf-8");

    return Response.json({ success: true, path: filePath });
  } catch (error) {
    console.error("[agent/file PUT]", error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}