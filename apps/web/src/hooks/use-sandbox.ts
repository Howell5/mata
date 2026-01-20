import { env } from "@/env";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type SandboxState = "creating" | "running" | "paused" | "terminated" | null;

interface SandboxInfo {
  id: string;
  projectId: string;
  state: SandboxState;
  previewUrl: string | null;
  agentSessionId: string | null;
  lastActiveAt: string;
}

interface UseSandboxOptions {
  projectId: string;
  autoStart?: boolean;
  maxRetries?: number;
}

interface SandboxError {
  message: string;
  canRetry: boolean;
  retryCount: number;
}

interface UseSandboxReturn {
  sandboxId: string | null;
  state: SandboxState;
  previewUrl: string | null;
  isStarting: boolean;
  isPausing: boolean;
  isTerminating: boolean;
  isResuming: boolean;
  isReady: boolean;
  error: SandboxError | null;
  retry: () => Promise<void>;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  terminate: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export function useSandbox({
  projectId,
  autoStart = true,
  maxRetries = 3,
}: UseSandboxOptions): UseSandboxReturn {
  const queryClient = useQueryClient();
  const lastVisibleRef = useRef(true);
  const [retryCount, setRetryCount] = useState(0);
  const [sandboxError, setSandboxError] = useState<SandboxError | null>(null);

  // Query current sandbox state from project
  const {
    data: sandboxInfo,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["sandbox", "info", projectId],
    queryFn: async (): Promise<SandboxInfo | null> => {
      const response = await api.api.projects[":id"].$get({
        param: { id: projectId },
      });
      const json = await response.json();
      if (!json.success) {
        throw new Error("Failed to fetch project");
      }
      const project = json.data as {
        sandbox: SandboxInfo | null;
      };
      return project.sandbox;
    },
    enabled: !!projectId,
    refetchInterval: (query) => {
      // Poll more frequently when creating
      const state = query.state.data?.state;
      if (state === "creating") return 2000;
      if (state === "running") return 10000;
      return false;
    },
  });

  // Start sandbox mutation with retry logic
  const startMutation = useMutation({
    mutationFn: async (): Promise<SandboxInfo> => {
      const response = await api.api.sandbox.project[":id"].start.$post({
        param: { id: projectId },
      });
      const json = await response.json();
      if (!json.success) {
        const errorMessage = (json as { error?: { message?: string } }).error?.message || "Failed to start sandbox";
        throw new Error(errorMessage);
      }
      return json.data as SandboxInfo;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["sandbox", "info", projectId], data);
      setSandboxError(null);
      setRetryCount(0);
    },
    onError: (error: Error) => {
      const canRetry = retryCount < maxRetries;
      setSandboxError({
        message: error.message,
        canRetry,
        retryCount,
      });
    },
  });

  // Pause sandbox mutation
  const pauseMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!sandboxInfo?.id) throw new Error("No sandbox to pause");
      const response = await fetch(
        `${env.VITE_API_URL}/api/sandbox/${sandboxInfo.id}/pause`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      const json = await response.json();
      if (!json.success) {
        const errorMessage = (json as { error?: { message?: string } }).error?.message || "Failed to pause sandbox";
        throw new Error(errorMessage);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sandbox", "info", projectId] });
    },
    onError: (error: Error) => {
      setSandboxError({
        message: error.message,
        canRetry: false,
        retryCount: 0,
      });
    },
  });

  // Terminate sandbox mutation
  const terminateMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!sandboxInfo?.id) throw new Error("No sandbox to terminate");
      const response = await fetch(
        `${env.VITE_API_URL}/api/sandbox/${sandboxInfo.id}/terminate`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      const json = await response.json();
      if (!json.success) {
        const errorMessage = (json as { error?: { message?: string } }).error?.message || "Failed to terminate sandbox";
        throw new Error(errorMessage);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sandbox", "info", projectId] });
    },
    onError: (error: Error) => {
      setSandboxError({
        message: error.message,
        canRetry: false,
        retryCount: 0,
      });
    },
  });

  // Resume sandbox mutation (separate from start for clarity)
  const resumeMutation = useMutation({
    mutationFn: async (): Promise<SandboxInfo> => {
      const response = await api.api.sandbox.project[":id"].start.$post({
        param: { id: projectId },
      });
      const json = await response.json();
      if (!json.success) {
        const errorMessage = (json as { error?: { message?: string } }).error?.message || "Failed to resume sandbox";
        throw new Error(errorMessage);
      }
      return json.data as SandboxInfo;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["sandbox", "info", projectId], data);
      setSandboxError(null);
      // Refresh file tree after resuming
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
    onError: (error: Error) => {
      setSandboxError({
        message: error.message,
        canRetry: true,
        retryCount: 0,
      });
    },
  });

  // Auto-start sandbox when entering page
  useEffect(() => {
    if (
      autoStart &&
      projectId &&
      !sandboxInfo &&
      !isLoading &&
      !startMutation.isPending
    ) {
      startMutation.mutate();
    }
  }, [autoStart, projectId, sandboxInfo, isLoading, startMutation]);

  // Handle page visibility for sandbox state
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        lastVisibleRef.current = false;
        console.log("[Sandbox] Page hidden, sandbox will auto-pause after timeout");
      } else {
        if (!lastVisibleRef.current) {
          console.log("[Sandbox] Page visible, checking sandbox state");
          const { data } = await refetch();
          // If sandbox was paused, resume it
          if (data?.state === "paused") {
            console.log("[Sandbox] Resuming paused sandbox");
            resumeMutation.mutate();
          }
        }
        lastVisibleRef.current = true;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refetch, resumeMutation]);

  const start = useCallback(async () => {
    setSandboxError(null);
    await startMutation.mutateAsync();
  }, [startMutation]);

  const pause = useCallback(async () => {
    setSandboxError(null);
    await pauseMutation.mutateAsync();
  }, [pauseMutation]);

  const terminate = useCallback(async () => {
    setSandboxError(null);
    await terminateMutation.mutateAsync();
  }, [terminateMutation]);

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const retry = useCallback(async () => {
    if (!sandboxError?.canRetry) return;
    setRetryCount((prev) => prev + 1);
    setSandboxError(null);
    await startMutation.mutateAsync();
  }, [sandboxError, startMutation]);

  const clearError = useCallback(() => {
    setSandboxError(null);
    setRetryCount(0);
  }, []);

  // Combine errors from different sources
  const combinedError = sandboxError || (error ? {
    message: error.message,
    canRetry: true,
    retryCount: 0,
  } : null);

  return {
    sandboxId: sandboxInfo?.id || null,
    state: sandboxInfo?.state || null,
    previewUrl: sandboxInfo?.previewUrl || null,
    isStarting: startMutation.isPending || sandboxInfo?.state === "creating",
    isPausing: pauseMutation.isPending,
    isTerminating: terminateMutation.isPending,
    isResuming: resumeMutation.isPending,
    isReady: sandboxInfo?.state === "running",
    error: combinedError,
    retry,
    start,
    pause,
    terminate,
    refresh,
    clearError,
  };
}
