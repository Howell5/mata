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
  RefreshCw,
  Terminal,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChatPanel } from "./components/chat-panel";
import { FileTree } from "./components/file-tree";
import { FileViewer } from "./components/file-viewer";
import { PreviewPanel } from "./components/preview-panel";
import { TerminalPanel } from "./components/terminal-panel";
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
  const [sandboxId, setSandboxId] = useState<string | null>(null);

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

  // Start sandbox when entering workspace
  const {
    data: sandboxInfo,
    isLoading: isSandboxStarting,
    refetch: refetchSandbox,
  } = useQuery({
    queryKey: ["sandbox", "start", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("No project ID");
      const response = await api.api.sandbox.project[":id"].start.$post({
        param: { id: projectId },
      });
      const json = await response.json();
      if (!json.success) {
        throw new Error("Failed to start sandbox");
      }
      return json.data as {
        id: string;
        projectId: string;
        state: string;
        previewUrl: string | null;
        agentSessionId: string | null;
        lastActiveAt: string;
      };
    },
    enabled: !!projectId,
    staleTime: 30000, // Don't refetch for 30 seconds
    retry: 2,
  });

  // Update sandboxId when sandbox starts
  useEffect(() => {
    if (sandboxInfo?.id) {
      setSandboxId(sandboxInfo.id);
    }
  }, [sandboxInfo]);

  // Handle page visibility for idle detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && sandboxId) {
        // User left the page, sandbox will auto-pause after idle timeout
        console.log("[Workspace] Page hidden, sandbox will auto-pause after timeout");
      } else if (!document.hidden && sandboxId) {
        // User returned, refetch sandbox to ensure it's running
        console.log("[Workspace] Page visible, checking sandbox state");
        refetchSandbox();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sandboxId, refetchSandbox]);

  // Refresh project data when sandbox state changes
  useEffect(() => {
    if (sandboxInfo) {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    }
  }, [sandboxInfo, projectId, queryClient]);

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

  const isSandboxReady = sandboxInfo?.state === "running";

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
            {isSandboxStarting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-sm text-muted-foreground">
                  Starting sandbox...
                </span>
              </>
            ) : isSandboxReady ? (
              <>
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm text-muted-foreground">Running</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-yellow-500" />
                <span className="text-sm text-muted-foreground">
                  {sandboxInfo?.state || "Initializing"}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
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
            onClick={() => refetchSandbox()}
            disabled={isSandboxStarting}
          >
            <RefreshCw
              className={`h-4 w-4 ${isSandboxStarting ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </header>

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
              {sandboxId && isSandboxReady ? (
                <FileTree
                  sandboxId={sandboxId}
                  onFileSelect={setSelectedFile}
                  selectedFile={selectedFile}
                />
              ) : (
                <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                  {isSandboxStarting ? "Loading..." : "Sandbox not ready"}
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
                <ChatPanel projectId={projectId} disabled={!isSandboxReady} />
              )}
              {activePanel === "preview" && sandboxId && (
                <PreviewPanel
                  sandboxId={sandboxId}
                  previewUrl={sandboxInfo?.previewUrl || null}
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
