import { env } from "@/env";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

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

function FileTreeSkeleton() {
  return (
    <div className="flex-1 overflow-auto py-2 px-2 space-y-1">
      {/* Folder skeletons */}
      <div className="flex items-center gap-2 py-1">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex items-center gap-2 py-1 pl-3">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex items-center gap-2 py-1 pl-3">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-16" />
      </div>
      {/* File skeletons */}
      <div className="flex items-center gap-2 py-1">
        <Skeleton className="h-4 w-4 opacity-0" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="flex items-center gap-2 py-1">
        <Skeleton className="h-4 w-4 opacity-0" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex items-center gap-2 py-1">
        <Skeleton className="h-4 w-4 opacity-0" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
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
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["files", sandboxId, "/"],
    queryFn: () => fetchFiles(sandboxId, "/"),
    enabled: !!sandboxId,
    refetchInterval: 5000,
  });

  if (isLoading) {
    return <FileTreeSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-sm text-red-500">Failed to load files</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Retry
        </Button>
      </div>
    );
  }

  if (!data?.files.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
        <Folder className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No files yet</p>
        <p className="text-xs text-muted-foreground">
          Files will appear here when created
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-auto py-2">
      {/* Refresh indicator */}
      {isFetching && !isLoading && (
        <div className="absolute right-2 top-2">
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        </div>
      )}
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
