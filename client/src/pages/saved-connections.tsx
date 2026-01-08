import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Monitor, Plus, Search, Pencil, Trash2, ArrowRight, MoreVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  getSavedConnections,
  addSavedConnection,
  removeSavedConnection,
  formatPartnerId,
} from "@/lib/device-store";
import type { SavedConnection } from "@shared/schema";

export default function SavedConnections() {
  const [connections, setConnections] = useState<SavedConnection[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<SavedConnection | null>(null);
  const [formData, setFormData] = useState({ name: "", partnerId: "", description: "" });
  const { toast } = useToast();

  useEffect(() => {
    setConnections(getSavedConnections());
  }, []);

  const filteredConnections = connections.filter(
    (connection) =>
      connection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      connection.partnerId.includes(searchQuery.replace(/\s/g, ""))
  );

  const handleSave = () => {
    const cleanedId = formData.partnerId.replace(/\s/g, "");
    if (!formData.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for this connection.",
        variant: "destructive",
      });
      return;
    }
    if (cleanedId.length < 9) {
      toast({
        title: "Invalid Partner ID",
        description: "Please enter a valid 9-digit Partner ID.",
        variant: "destructive",
      });
      return;
    }

    addSavedConnection({
      name: formData.name.trim(),
      partnerId: cleanedId,
      description: formData.description.trim() || undefined,
    });

    setConnections(getSavedConnections());
    setDialogOpen(false);
    setFormData({ name: "", partnerId: "", description: "" });
    toast({
      title: "Connection saved",
      description: `${formData.name} has been added to your saved connections.`,
    });
  };

  const handleDelete = (connection: SavedConnection) => {
    removeSavedConnection(connection.id);
    setConnections(getSavedConnections());
    toast({
      title: "Connection removed",
      description: `${connection.name} has been removed from your saved connections.`,
    });
  };

  const handleConnect = (partnerId: string) => {
    window.location.href = `/session?partnerId=${partnerId}`;
  };

  const formatInput = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 9);
    return cleaned.match(/.{1,3}/g)?.join(" ") || cleaned;
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold" data-testid="text-page-title">Saved Connections</h1>
            <p className="text-muted-foreground">
              Manage your frequently used connections
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-connection">
                <Plus className="h-4 w-4" />
                <span>Add Connection</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Connection</DialogTitle>
                <DialogDescription>
                  Save a connection for quick access later
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Office PC, Home Computer"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    data-testid="input-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partner-id">Partner ID</Label>
                  <Input
                    id="partner-id"
                    placeholder="XXX XXX XXX"
                    value={formData.partnerId}
                    onChange={(e) =>
                      setFormData({ ...formData, partnerId: formatInput(e.target.value) })
                    }
                    className="font-mono"
                    data-testid="input-partner-id"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    placeholder="e.g., Work laptop in meeting room"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    data-testid="input-description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} data-testid="button-save">Save Connection</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search connections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>

        {filteredConnections.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredConnections.map((connection) => (
              <Card
                key={connection.id}
                className="group"
                data-testid={`card-connection-${connection.id}`}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                    <Monitor className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-medium">{connection.name}</p>
                    <p className="font-mono text-sm text-muted-foreground">
                      {formatPartnerId(connection.partnerId)}
                    </p>
                    {connection.description && (
                      <p className="text-xs text-muted-foreground">{connection.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleConnect(connection.partnerId)}
                      data-testid={`button-connect-${connection.id}`}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-menu-${connection.id}`}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleConnect(connection.partnerId)}>
                          <ArrowRight className="mr-2 h-4 w-4" />
                          Connect
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(connection)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : connections.length > 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
              <Search className="h-12 w-12 text-muted-foreground" />
              <div className="space-y-1 text-center">
                <p className="font-medium">No connections found</p>
                <p className="text-sm text-muted-foreground">Try a different search term</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Monitor className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1 text-center">
                <p className="font-medium">No saved connections</p>
                <p className="text-sm text-muted-foreground">
                  Add frequently used connections for quick access
                </p>
              </div>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setDialogOpen(true)}
                data-testid="button-add-first"
              >
                <Plus className="h-4 w-4" />
                <span>Add Connection</span>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
