import { env } from "@/env";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}

interface FileTreeProps {
  sandboxId: string;
  onFileSelect: (path: string) => void;
  selectedFile: string | null;
}

interface FileTreeItemProps {
  node: FileNode;
  sandboxId: string;
  level: number;
  onFileSelect: (path: string) => void;
  selectedFile: string | null;
}

async function fetchFiles(sandboxId: string, path: string) {
  const response = await fetch(
    `${env.VITE_API_URL}/api/sandbox/${sandboxId}/files?path=${encodeURIComponent(path)}`,
    { credentials: "include" }
  );
  const json = await response.json();
  if (!json.success) {
    throw new Error("Failed to fetch files");
  }
  return json.data as { files: FileNode[]; path: string };
}

function FileTreeItem({
  node,
  sandboxId,
  level,
  onFileSelect,
  selectedFile,
}: FileTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState<FileNode[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (node.isDir) {
      if (!isExpanded && !children) {
        setIsLoading(true);
        try {
          const data = await fetchFiles(sandboxId, node.path);
          setChildren(data.files);
        } catch (error) {
          console.error("Failed to load directory:", error);
        } finally {
          setIsLoading(false);
        }
      }
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect(node.path);
    }
  };

  const isSelected = selectedFile === node.path;

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          "flex w-full items-center gap-1 rounded px-2 py-1 text-left text-sm hover:bg-muted/50",
          isSelected && "bg-muted",
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {node.isDir ? (
          <>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-blue-500" />
            ) : (
              <Folder className="h-4 w-4 text-blue-500" />
            )}
          </>
        ) : (
          <>
            <span className="w-4" />
            <File className="h-4 w-4 text-muted-foreground" />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {node.isDir && isExpanded && children && (
        <div>
          {children
            .sort((a, b) => {
              if (a.isDir && !b.isDir) return -1;
              if (!a.isDir && b.isDir) return 1;
              return a.name.localeCompare(b.name);
            })
            .map((child) => (
              <FileTreeItem
                key={child.path}
                node={child}
                sandboxId={sandboxId}
                level={level + 1}
                onFileSelect={onFileSelect}
                selectedFile={selectedFile}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export function FileTree({
  sandboxId,
  onFileSelect,
  selectedFile,
}: FileTreeProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["files", sandboxId, "/"],
    queryFn: () => fetchFiles(sandboxId, "/"),
    enabled: !!sandboxId,
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-red-500">
        Failed to load files
      </div>
    );
  }

  if (!data?.files.length) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted-foreground">
        No files yet
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto py-2">
      {data.files
        .sort((a, b) => {
          if (a.isDir && !b.isDir) return -1;
          if (!a.isDir && b.isDir) return 1;
          return a.name.localeCompare(b.name);
        })
        .map((node) => (
          <FileTreeItem
            key={node.path}
            node={node}
            sandboxId={sandboxId}
            level={0}
            onFileSelect={onFileSelect}
            selectedFile={selectedFile}
          />
        ))}
    </div>
  );
}
