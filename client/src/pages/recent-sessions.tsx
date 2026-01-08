import { useState, useEffect } from "react";
import { Monitor, Clock, ArrowUpRight, Trash2, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatPartnerId } from "@/lib/device-store";
import type { Session } from "@shared/schema";

interface SessionWithDetails extends Session {
  deviceName?: string;
  partnerId?: string;
}

export default function RecentSessions() {
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("remotedesk-sessions");
    if (stored) {
      setSessions(JSON.parse(stored));
    }
  }, []);

  const filteredSessions = sessions.filter(
    (session) =>
      session.deviceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.partnerId?.includes(searchQuery.replace(/\s/g, ""))
  );

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const duration = Math.floor((endTime - startTime) / 1000);
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    if (days === 1) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    if (days < 7) {
      return `${days} days ago`;
    }
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status: Session["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-status-online/20 text-status-online">Active</Badge>;
      case "ended":
        return <Badge variant="secondary">Ended</Badge>;
      case "connecting":
        return <Badge className="bg-status-away/20 text-status-away">Connecting</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getQualityBadge = (quality?: Session["quality"]) => {
    switch (quality) {
      case "excellent":
        return <Badge className="bg-status-online/20 text-status-online" variant="outline">Excellent</Badge>;
      case "good":
        return <Badge className="bg-primary/20 text-primary" variant="outline">Good</Badge>;
      case "fair":
        return <Badge className="bg-status-away/20 text-status-away" variant="outline">Fair</Badge>;
      case "poor":
        return <Badge className="bg-status-busy/20 text-status-busy" variant="outline">Poor</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold" data-testid="text-page-title">Recent Sessions</h1>
            <p className="text-muted-foreground">
              View your connection history and session details
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by device name or Partner ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>

        {filteredSessions.length > 0 ? (
          <div className="space-y-3">
            {filteredSessions.map((session) => (
              <Card key={session.id} data-testid={`card-session-${session.id}`}>
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                      <Monitor className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{session.deviceName || "Unknown Device"}</span>
                        {getStatusBadge(session.status)}
                        {getQualityBadge(session.quality)}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-mono">
                          {session.partnerId ? formatPartnerId(session.partnerId) : "---"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(session.startedAt, session.endedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(session.startedAt)}
                    </span>
                    {session.status === "active" && (
                      <Button size="sm" className="gap-1" data-testid={`button-reconnect-${session.id}`}>
                        <ArrowUpRight className="h-4 w-4" />
                        <span>Open</span>
                      </Button>
                    )}
                    {session.status === "ended" && (
                      <Button variant="outline" size="sm" className="gap-1" data-testid={`button-reconnect-${session.id}`}>
                        <ArrowUpRight className="h-4 w-4" />
                        <span>Reconnect</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sessions.length > 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
              <Search className="h-12 w-12 text-muted-foreground" />
              <div className="space-y-1 text-center">
                <p className="font-medium">No sessions found</p>
                <p className="text-sm text-muted-foreground">
                  Try a different search term
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1 text-center">
                <p className="font-medium">No session history</p>
                <p className="text-sm text-muted-foreground">
                  Your recent connections will appear here
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
