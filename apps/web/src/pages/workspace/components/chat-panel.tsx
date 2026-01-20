import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { env } from "@/env";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  ChevronDown,
  ChevronRight,
  Loader2,
  Send,
  Square,
  User,
  Wrench,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  projectId: string;
  disabled?: boolean;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    input: Record<string, unknown>;
    result?: unknown;
    isError?: boolean;
  }>;
  createdAt: string;
}


export function ChatPanel({ projectId, disabled }: ChatPanelProps) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingToolCalls, setStreamingToolCalls] = useState<
    Array<{
      id: string;
      name: string;
      input: Record<string, unknown>;
      result?: unknown;
      isError?: boolean;
    }>
  >([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch conversation history
  const { data: conversationData, isLoading } = useQuery({
    queryKey: ["conversation", projectId],
    queryFn: async () => {
      const response = await api.api.conversations[":id"].$get({
        param: { id: projectId },
      });
      const json = await response.json();
      if (!json.success) {
        throw new Error("Failed to fetch conversation");
      }
      return json.data as {
        conversationId: string | null;
        messages: Message[];
      };
    },
    enabled: !!projectId,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationData?.messages, streamingContent, streamingToolCalls]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming || disabled) return;

    const message = input.trim();
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");
    setStreamingToolCalls([]);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${env.VITE_API_URL}/api/agent/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ projectId, content: message }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            // Wait for next line with data
            continue;
          }
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.substring(6));
            handleSSEEvent(data);
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        console.log("Request aborted");
      } else {
        console.error("Chat error:", error);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      // Refresh conversation history
      queryClient.invalidateQueries({ queryKey: ["conversation", projectId] });
      // Refresh file tree
      queryClient.invalidateQueries({ queryKey: ["files"] });
    }
  }, [input, isStreaming, disabled, projectId, queryClient]);

  const handleSSEEvent = (data: Record<string, unknown>) => {
    // Handle different event types
    if (data.content) {
      setStreamingContent((prev) => prev + (data.content as string));
    }
    if (data.id && data.name) {
      // Tool call
      setStreamingToolCalls((prev) => [
        ...prev,
        {
          id: data.id as string,
          name: data.name as string,
          input: data.input as Record<string, unknown>,
        },
      ]);
    }
    if (data.toolUseId && data.result !== undefined) {
      // Tool result
      setStreamingToolCalls((prev) =>
        prev.map((tc) =>
          tc.id === data.toolUseId
            ? { ...tc, result: data.result, isError: data.isError as boolean }
            : tc
        )
      );
    }
  };

  const handleStop = useCallback(async () => {
    abortControllerRef.current?.abort();
    try {
      await api.api.agent.stop.$post({
        json: { id: projectId },
      });
    } catch (error) {
      console.error("Failed to stop agent:", error);
    }
  }, [projectId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const messages = conversationData?.messages || [];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Bot className="h-4 w-4" />
        <span className="text-sm font-medium">Chat</span>
        {isStreaming && (
          <span className="text-xs text-muted-foreground">(Thinking...)</span>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-auto p-3 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 && !isStreaming ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Bot className="h-12 w-12 mb-4" />
            <p className="text-sm">Start a conversation</p>
            <p className="text-xs mt-1">
              Ask me to help you build your web application
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))}
            {/* Streaming message */}
            {isStreaming && (streamingContent || streamingToolCalls.length > 0) && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-2">
                  {streamingToolCalls.map((tc) => (
                    <ToolCallItem key={tc.id} toolCall={tc} />
                  ))}
                  {streamingContent && (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {streamingContent}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Sandbox not ready..." : "Type a message..."}
            disabled={disabled || isStreaming}
            className="min-h-[60px] resize-none"
            rows={2}
          />
          {isStreaming ? (
            <Button
              variant="destructive"
              size="icon"
              onClick={handleStop}
              className="shrink-0 self-end"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || disabled}
              className="shrink-0 self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className="flex gap-3">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-muted" : "bg-primary/10"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="flex-1 space-y-2">
        {message.toolCalls?.map((tc) => (
          <ToolCallItem key={tc.id} toolCall={tc} />
        ))}
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    </div>
  );
}

function ToolCallItem({
  toolCall,
}: {
  toolCall: {
    id: string;
    name: string;
    input: Record<string, unknown>;
    result?: unknown;
    isError?: boolean;
  };
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-md border bg-muted/30 text-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted/50"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <Wrench className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{toolCall.name}</span>
        {toolCall.isError && (
          <span className="text-xs text-red-500">(error)</span>
        )}
      </button>
      {isExpanded && (
        <div className="border-t px-3 py-2 space-y-2">
          <div>
            <div className="text-xs font-medium text-muted-foreground">
              Input:
            </div>
            <pre className="text-xs overflow-auto max-h-32 mt-1">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>
          {toolCall.result !== undefined && (
            <div>
              <div className="text-xs font-medium text-muted-foreground">
                Result:
              </div>
              <pre
                className={cn(
                  "text-xs overflow-auto max-h-32 mt-1",
                  toolCall.isError && "text-red-500"
                )}
              >
                {typeof toolCall.result === "string"
                  ? toolCall.result
                  : JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
