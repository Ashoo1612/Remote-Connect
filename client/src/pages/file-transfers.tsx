import { useState, useEffect } from "react";
import { FileUp, FileDown, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { FileTransfer } from "@shared/schema";

export default function FileTransfers() {
  const [transfers, setTransfers] = useState<FileTransfer[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("remotedesk-transfers");
    if (stored) {
      setTransfers(JSON.parse(stored));
    }
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getStatusIcon = (status: FileTransfer["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-status-online" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-status-busy" />;
      case "transferring":
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: FileTransfer["status"]) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-status-online/20 text-status-online">Completed</Badge>;
      case "failed":
        return <Badge className="bg-status-busy/20 text-status-busy">Failed</Badge>;
      case "transferring":
        return <Badge className="bg-primary/20 text-primary">Transferring</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">File Transfers</h1>
          <p className="text-muted-foreground">
            View and manage file transfer history
          </p>
        </div>

        {transfers.length > 0 ? (
          <div className="space-y-3">
            {transfers.map((transfer) => (
              <Card key={transfer.id} data-testid={`card-transfer-${transfer.id}`}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                    {transfer.senderId === "local" ? (
                      <FileUp className="h-6 w-6 text-muted-foreground" />
                    ) : (
                      <FileDown className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{transfer.fileName}</span>
                        {getStatusBadge(transfer.status)}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatFileSize(transfer.fileSize)}
                      </span>
                    </div>

                    {transfer.status === "transferring" && (
                      <div className="space-y-1">
                        <Progress value={transfer.progress} className="h-1.5" />
                        <p className="text-xs text-muted-foreground">{transfer.progress}% complete</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center">{getStatusIcon(transfer.status)}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <FileUp className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1 text-center">
                <p className="font-medium">No file transfers</p>
                <p className="text-sm text-muted-foreground">
                  Files transferred during remote sessions will appear here
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                <FileUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold" data-testid="text-sent-count">
                  {transfers.filter((t) => t.senderId === "local").length}
                </p>
                <p className="text-sm text-muted-foreground">Files Sent</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                <FileDown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold" data-testid="text-received-count">
                  {transfers.filter((t) => t.senderId !== "local").length}
                </p>
                <p className="text-sm text-muted-foreground">Files Received</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold" data-testid="text-completed-count">
                  {transfers.filter((t) => t.status === "completed").length}
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
