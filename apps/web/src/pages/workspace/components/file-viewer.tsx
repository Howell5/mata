import { env } from "@/env";
import { useQuery } from "@tanstack/react-query";
import { FileCode2, Loader2, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface FileViewerProps {
  sandboxId: string;
  filePath: string;
}

function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    html: "html",
    css: "css",
    scss: "scss",
    md: "markdown",
    py: "python",
    go: "go",
    rs: "rust",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
  };
  return langMap[ext || ""] || "plaintext";
}

function FileViewerSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Header skeleton */}
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-16" />
      </div>
      {/* Content skeleton */}
      <div className="flex-1 overflow-auto p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    </div>
  );
}

export function FileViewer({ sandboxId, filePath }: FileViewerProps) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["file", sandboxId, filePath],
    queryFn: async () => {
      const response = await fetch(
        `${env.VITE_API_URL}/api/sandbox/${sandboxId}/file?path=${encodeURIComponent(filePath)}`,
        { credentials: "include" }
      );
      const json = await response.json();
      if (!json.success) {
        throw new Error("Failed to fetch file");
      }
      return json.data as { path: string; content: string };
    },
    enabled: !!sandboxId && !!filePath,
  });

  if (isLoading) {
    return <FileViewerSkeleton />;
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <FileCode2 className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-red-500">Failed to load file</p>
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

  const fileName = filePath.split("/").pop() || filePath;
  const language = getLanguageFromPath(filePath);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <FileCode2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{fileName}</span>
          <span className="text-xs text-muted-foreground">({language})</span>
        </div>
        {isFetching && !isLoading && (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 overflow-auto bg-muted/30">
        <pre className="h-full p-4 text-sm">
          <code className={`language-${language}`}>
            {data?.content || ""}
          </code>
        </pre>
      </div>
    </div>
  );
}
