import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Play, Trash2 } from "lucide-react";
import { useRef, useState, useEffect } from "react";

interface TerminalPanelProps {
  sandboxId: string;
}

interface TerminalOutput {
  id: number;
  type: "command" | "stdout" | "stderr" | "exit";
  content: string;
  timestamp: Date;
}

export function TerminalPanel({ sandboxId }: TerminalPanelProps) {
  const [command, setCommand] = useState("");
  const [outputs, setOutputs] = useState<TerminalOutput[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idCounter = useRef(0);

  // Execute command mutation
  const executeCommand = useMutation({
    mutationFn: async (cmd: string) => {
      const response = await api.api.sandbox[":sandboxId"].execute.$post({
        param: { sandboxId },
        json: {
          command: cmd,
          cwd: "/home/user/project",
          timeoutMs: 60000,
        },
      });
      const json = await response.json();
      if (!json.success) {
        throw new Error("Failed to execute command");
      }
      return json.data as { stdout: string; stderr: string; exitCode: number };
    },
    onMutate: (cmd) => {
      // Add command to output
      setOutputs((prev) => [
        ...prev,
        {
          id: idCounter.current++,
          type: "command",
          content: `$ ${cmd}`,
          timestamp: new Date(),
        },
      ]);
    },
    onSuccess: (result, cmd) => {
      // Add stdout
      if (result.stdout) {
        setOutputs((prev) => [
          ...prev,
          {
            id: idCounter.current++,
            type: "stdout",
            content: result.stdout,
            timestamp: new Date(),
          },
        ]);
      }
      // Add stderr
      if (result.stderr) {
        setOutputs((prev) => [
          ...prev,
          {
            id: idCounter.current++,
            type: "stderr",
            content: result.stderr,
            timestamp: new Date(),
          },
        ]);
      }
      // Add exit code if non-zero
      if (result.exitCode !== 0) {
        setOutputs((prev) => [
          ...prev,
          {
            id: idCounter.current++,
            type: "exit",
            content: `Process exited with code ${result.exitCode}`,
            timestamp: new Date(),
          },
        ]);
      }
      // Add to command history
      setCommandHistory((prev) => [...prev.filter((c) => c !== cmd), cmd]);
      setHistoryIndex(-1);
    },
    onError: (error) => {
      setOutputs((prev) => [
        ...prev,
        {
          id: idCounter.current++,
          type: "stderr",
          content: `Error: ${error.message}`,
          timestamp: new Date(),
        },
      ]);
    },
  });

  // Auto-scroll to bottom when outputs change
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || executeCommand.isPending) return;
    executeCommand.mutate(command.trim());
    setCommand("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex =
          historyIndex < commandHistory.length - 1
            ? historyIndex + 1
            : historyIndex;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[commandHistory.length - 1 - newIndex] || "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[commandHistory.length - 1 - newIndex] || "");
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand("");
      }
    }
  };

  const clearOutput = () => {
    setOutputs([]);
  };

  return (
    <div className="flex h-full flex-col bg-zinc-900 font-mono text-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-700 px-3 py-2">
        <span className="text-xs text-zinc-400">Terminal</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-zinc-400 hover:text-white"
          onClick={clearOutput}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Output area */}
      <div
        ref={outputRef}
        className="flex-1 overflow-auto p-3"
        onClick={() => inputRef.current?.focus()}
      >
        {outputs.map((output) => (
          <div
            key={output.id}
            className={`whitespace-pre-wrap ${
              output.type === "command"
                ? "text-green-400"
                : output.type === "stderr"
                  ? "text-red-400"
                  : output.type === "exit"
                    ? "text-yellow-400"
                    : "text-zinc-300"
            }`}
          >
            {output.content}
          </div>
        ))}
        {executeCommand.isPending && (
          <div className="flex items-center gap-2 text-zinc-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Running...</span>
          </div>
        )}
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="border-t border-zinc-700 p-2">
        <div className="flex items-center gap-2">
          <span className="text-green-400">$</span>
          <Input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command..."
            className="flex-1 border-none bg-transparent text-zinc-300 placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={executeCommand.isPending}
          />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-zinc-400 hover:text-white"
            disabled={!command.trim() || executeCommand.isPending}
          >
            <Play className="h-3 w-3" />
          </Button>
        </div>
      </form>
    </div>
  );
}
