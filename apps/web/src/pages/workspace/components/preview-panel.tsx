import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { env } from "@/env";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { useState, useRef } from "react";

interface PreviewPanelProps {
  sandboxId: string;
  previewUrl: string | null;
}

export function PreviewPanel({ sandboxId, previewUrl: initialPreviewUrl }: PreviewPanelProps) {
  const [port, setPort] = useState("3000");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data: previewData, isLoading } = useQuery({
    queryKey: ["preview", sandboxId, port],
    queryFn: async () => {
      const response = await fetch(
        `${env.VITE_API_URL}/api/sandbox/${sandboxId}/preview?port=${port}`,
        { credentials: "include" }
      );
      const json = await response.json();
      if (!json.success) {
        throw new Error("Failed to get preview URL");
      }
      return json.data as { port: number; url: string };
    },
    enabled: !!sandboxId && !!port,
    retry: false,
  });

  const previewUrl = previewData?.url || initialPreviewUrl;

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handlePortChange = (newPort: string) => {
    const portNum = parseInt(newPort, 10);
    if (!isNaN(portNum) && portNum > 0 && portNum <= 65535) {
      setPort(newPort);
    }
  };

  const handleOpenInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, "_blank");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Preview</span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Port:</span>
            <Input
              type="number"
              value={port}
              onChange={(e) => handlePortChange(e.target.value)}
              className="h-6 w-16 text-xs"
              min={1}
              max={65535}
            />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleRefresh}
            disabled={!previewUrl}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleOpenInNewTab}
            disabled={!previewUrl}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="flex-1 bg-muted/30">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : previewUrl ? (
          <iframe
            ref={iframeRef}
            src={previewUrl}
            className="h-full w-full border-0"
            title="Preview"
            sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <p className="text-sm">No preview available</p>
            <p className="text-xs">
              Start a dev server on port {port} to see the preview
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
