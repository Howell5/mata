import { env } from "@/env";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

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

export function FileViewer({ sandboxId, filePath }: FileViewerProps) {
  const { data, isLoading, error } = useQuery({
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
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        Failed to load file
      </div>
    );
  }

  const fileName = filePath.split("/").pop() || filePath;
  const language = getLanguageFromPath(filePath);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <span className="text-sm font-medium">{fileName}</span>
        <span className="text-xs text-muted-foreground">({language})</span>
      </div>
      <div className="flex-1 overflow-auto">
        <pre className="h-full p-4 text-sm">
          <code className={`language-${language}`}>
            {data?.content || ""}
          </code>
        </pre>
      </div>
    </div>
  );
}
