import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquare,
  Pause,
  Play,
  RefreshCw,
  Terminal,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChatPanel } from "./components/chat-panel";
import { FileTree } from "./components/file-tree";
import { FileViewer } from "./components/file-viewer";
import { PreviewPanel } from "./components/preview-panel";
import { TerminalPanel } from "./components/terminal-panel";
import { SandboxErrorAlert } from "./components/sandbox-error";
import { useSandbox } from "@/hooks/use-sandbox";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

type ActivePanel = "chat" | "preview" | "terminal";

interface ProjectWithSandbox {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  sandbox: {
    id: string;
    state: "creating" | "running" | "paused" | "terminated";
    previewUrl: string | null;
    agentSessionId: string | null;
    lastActiveAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export function WorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [activePanel, setActivePanel] = useState<ActivePanel>("chat");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Fetch project details
  const { data: project, isLoading: isProjectLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("No project ID");
      const response = await api.api.projects[":id"].$get({
        param: { id: projectId },
      });
      const json = await response.json();
      if (!json.success) {
        throw new Error("Failed to fetch project");
      }
      return json.data as ProjectWithSandbox;
    },
    enabled: !!projectId,
  });

  // Use enhanced sandbox hook
  const {
    sandboxId,
    state: sandboxState,
    previewUrl,
    isStarting,
    isResuming,
    isPausing,
    isReady,
    error: sandboxError,
    start,
    pause,
    retry,
    refresh,
    clearError,
  } = useSandbox({
    projectId: projectId || "",
    autoStart: true,
    maxRetries: 3,
  });

  // Refresh project data when sandbox state changes
  const handleRefresh = async () => {
    await refresh();
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
  };

  if (isProjectLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Project not found</h1>
        <Button asChild className="mt-4">
          <Link to={ROUTES.PROJECTS}>Back to Projects</Link>
        </Button>
      </div>
    );
  }

  const getStatusDisplay = () => {
    if (isStarting) {
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
        text: "Starting sandbox...",
        color: "bg-blue-500",
      };
    }
    if (isResuming) {
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
        text: "Resuming sandbox...",
        color: "bg-blue-500",
      };
    }
    if (isPausing) {
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />,
        text: "Pausing sandbox...",
        color: "bg-yellow-500",
      };
    }
    if (sandboxState === "running") {
      return {
        icon: <span className="h-2 w-2 rounded-full bg-green-500" />,
        text: "Running",
        color: "bg-green-500",
      };
    }
    if (sandboxState === "paused") {
      return {
        icon: <span className="h-2 w-2 rounded-full bg-yellow-500" />,
        text: "Paused",
        color: "bg-yellow-500",
      };
    }
    if (sandboxState === "creating") {
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
        text: "Creating sandbox...",
        color: "bg-blue-500",
      };
    }
    return {
      icon: <span className="h-2 w-2 rounded-full bg-gray-400" />,
      text: sandboxState || "Initializing",
      color: "bg-gray-400",
    };
  };

  const status = getStatusDisplay();

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={ROUTES.PROJECTS}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">{project.name}</h1>
          {/* Sandbox status indicator */}
          <div className="flex items-center gap-2">
            {status.icon}
            <span className="text-sm text-muted-foreground">{status.text}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Sandbox controls */}
          {sandboxState === "paused" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => start()}
              disabled={isStarting || isResuming}
            >
              <Play className="mr-1 h-3 w-3" />
              Resume
            </Button>
          )}
          {sandboxState === "running" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => pause()}
              disabled={isPausing}
            >
              <Pause className="mr-1 h-3 w-3" />
              Pause
            </Button>
          )}
          {/* Panel toggles */}
          <div className="flex rounded-md border">
            <Button
              variant={activePanel === "chat" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-r-none"
              onClick={() => setActivePanel("chat")}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button
              variant={activePanel === "preview" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-none border-x"
              onClick={() => setActivePanel("preview")}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant={activePanel === "terminal" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-l-none"
              onClick={() => setActivePanel("terminal")}
            >
              <Terminal className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isStarting || isResuming}
          >
            <RefreshCw
              className={`h-4 w-4 ${isStarting || isResuming ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </header>

      {/* Error Alert */}
      {sandboxError && (
        <div className="border-b px-4 py-2">
          <SandboxErrorAlert
            error={sandboxError}
            onRetry={retry}
            onDismiss={clearError}
            maxRetries={3}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup orientation="horizontal">
          {/* Sidebar - File Tree */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <div className="flex h-full flex-col border-r">
              <div className="flex items-center gap-2 border-b px-3 py-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">Files</span>
              </div>
              {sandboxId && isReady ? (
                <FileTree
                  sandboxId={sandboxId}
                  onFileSelect={setSelectedFile}
                  selectedFile={selectedFile}
                />
              ) : (
                <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                  {isStarting || isResuming ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading...</span>
                    </div>
                  ) : sandboxState === "paused" ? (
                    <div className="flex flex-col items-center gap-2">
                      <span>Sandbox paused</span>
                      <Button size="sm" onClick={() => start()}>
                        <Play className="mr-1 h-3 w-3" />
                        Resume
                      </Button>
                    </div>
                  ) : (
                    "Sandbox not ready"
                  )}
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Main Panel */}
          <ResizablePanel defaultSize={50}>
            <div className="h-full overflow-hidden">
              {selectedFile && sandboxId ? (
                <FileViewer sandboxId={sandboxId} filePath={selectedFile} />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  Select a file to view
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Right Panel - Chat/Preview/Terminal */}
          <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
            <div className="h-full overflow-hidden">
              {activePanel === "chat" && projectId && (
                <ChatPanel projectId={projectId} disabled={!isReady} />
              )}
              {activePanel === "preview" && sandboxId && (
                <PreviewPanel
                  sandboxId={sandboxId}
                  previewUrl={previewUrl}
                />
              )}
              {activePanel === "terminal" && sandboxId && (
                <TerminalPanel sandboxId={sandboxId} />
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
