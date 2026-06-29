"use client";

import { useState, useEffect } from "react";
import { useAtomValue } from "jotai";
import { activePatientIdAtom } from "@/lib/state/_atoms";
import { FolderOpen, Folder, File, ChevronRight, ChevronDown, FolderTree, Loader2, Puzzle } from "lucide-react";

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: TreeNode[];
}

interface FilesystemTreeProps {
  onSelectFile?: (path: string) => void;
  selectedFile?: string | null;
}

function isHermesPath(path: string): boolean {
  return path.startsWith(".hermes");
}

function TreeNodeItem({
  node,
  depth = 0,
  onSelectFile,
  selectedFile,
}: {
  node: TreeNode;
  depth?: number;
  onSelectFile?: (path: string) => void;
  selectedFile?: string | null;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = node.type === "directory" && node.children && node.children.length > 0;
  const isEmptyDir = node.type === "directory" && (!node.children || node.children.length === 0);
  const hermes = isHermesPath(node.path);
  const isFile = node.type === "file";
  const isSelected = selectedFile === node.path;

  const handleClick = () => {
    if (isFile && onSelectFile) {
      onSelectFile(node.path);
    } else if (hasChildren) {
      setExpanded(!expanded);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className={`flex items-center gap-1 w-full text-left py-0.5 px-1 rounded-sm text-[11px] transition-colors cursor-pointer ${
          isSelected
            ? "bg-accent text-foreground"
            : "hover:bg-accent/50"
        } ${isFile ? "cursor-pointer" : ""} ${isEmptyDir ? "cursor-default" : ""}`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}
        {node.type === "directory" ? (
          expanded ? (
            <FolderOpen className={`size-3 shrink-0 ${hermes ? "text-amber-500/60" : "text-emerald-500/60"}`} />
          ) : (
            <Folder className={`size-3 shrink-0 ${hermes ? "text-amber-500/40" : "text-emerald-500/40"}`} />
          )
        ) : (
          <File className={`size-3 shrink-0 ${isSelected ? "text-emerald-400" : hermes ? "text-amber-400/40" : "text-muted-foreground/50"}`} />
        )}
        <span className={`truncate ${isSelected ? "text-foreground" : hermes ? "text-amber-300/70" : "text-muted-foreground"}`}>
          {node.name}
          {isEmptyDir && (
            <span className="text-muted-foreground/40 ml-1">(empty)</span>
          )}
        </span>
      </button>
      {expanded && hasChildren && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              onSelectFile={onSelectFile}
              selectedFile={selectedFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FilesystemTree({ onSelectFile, selectedFile }: FilesystemTreeProps) {
  const activePatientId = useAtomValue(activePatientIdAtom);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const url = activePatientId
      ? `/api/agent/tree?patientId=${encodeURIComponent(activePatientId)}`
      : "/api/agent/tree";

    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true);
    setError("");
    /* eslint-enable react-hooks/set-state-in-effect */

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setLoading(false);
        if (data.error) {
          setError(data.error);
        } else {
          setTree(data.tree ?? []);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setLoading(false);
        setError(`Failed to load: ${String(err)}`);
      });

    return () => { cancelled = true; };
  }, [activePatientId]);

  const dataNodes = tree.filter((n) => !isHermesPath(n.path));
  const hermesNodes = tree.filter((n) => isHermesPath(n.path));

  return (
    <div className="ui-content-section ui-content-section-agent-file-tree flex flex-col h-full">
      <div className="ui-header ui-header-agent-file-tree shrink-0 px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-1.5">
          <FolderTree className="size-3.5 text-emerald-400" />
          <span className="text-[11px] font-medium">
            {activePatientId ? "Patient Files" : "Explorer"}
          </span>
        </div>
        <p className="text-[9px] text-muted-foreground mt-0.5 truncate">
          {activePatientId
            ? `data/patients/${activePatientId}`
            : "data/ + .hermes/"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-1">
        {loading && (
          <div className="flex items-center gap-2 px-2 py-4 text-[11px] text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Loading…
          </div>
        )}

        {error && (
          <div className="px-2 py-2 text-[10px] text-destructive">{error}</div>
        )}

        {!loading && !error && tree.length === 0 && (
          <div className="px-2 py-4 text-[10px] text-muted-foreground text-center">
            No files found
          </div>
        )}

        {!loading && dataNodes.map((node) => (
          <TreeNodeItem
            key={node.path}
            node={node}
            onSelectFile={onSelectFile}
            selectedFile={selectedFile}
          />
        ))}

        {!loading && hermesNodes.length > 0 && (
          <>
            <div className="flex items-center gap-1.5 px-2 pt-3 pb-1">
              <Puzzle className="size-3 text-amber-400" />
              <span className="text-[10px] font-medium text-amber-400/80">.hermes</span>
            </div>
            {hermesNodes.map((node) => (
              <TreeNodeItem
                key={node.path}
                node={node}
                depth={1}
                onSelectFile={onSelectFile}
                selectedFile={selectedFile}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}