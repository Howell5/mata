import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, X } from "lucide-react";

interface SandboxError {
  message: string;
  canRetry: boolean;
  retryCount: number;
}

interface SandboxErrorProps {
  error: SandboxError;
  onRetry: () => void;
  onDismiss: () => void;
  maxRetries?: number;
}

export function SandboxErrorAlert({
  error,
  onRetry,
  onDismiss,
  maxRetries = 3,
}: SandboxErrorProps) {
  const remainingRetries = maxRetries - error.retryCount;

  return (
    <Alert variant="destructive" className="relative">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Sandbox Error</AlertTitle>
      <AlertDescription className="mt-2">
        <p>{error.message}</p>
        <div className="mt-3 flex items-center gap-2">
          {error.canRetry && remainingRetries > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="h-7"
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Retry ({remainingRetries} left)
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-7"
          >
            <X className="mr-1 h-3 w-3" />
            Dismiss
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
