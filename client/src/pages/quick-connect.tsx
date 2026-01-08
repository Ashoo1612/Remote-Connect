import { useState } from "react";
import { ArrowRight, Monitor, Keyboard, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

export default function QuickConnect() {
  const [partnerId, setPartnerId] = useState("");
  const [connectionMode, setConnectionMode] = useState<"remote" | "view">("remote");
  const { toast } = useToast();

  const handleConnect = () => {
    const cleanedId = partnerId.replace(/\s/g, "");
    if (cleanedId.length >= 9) {
      window.location.href = `/session?partnerId=${cleanedId}&role=viewer`;
    } else {
      toast({
        title: "Invalid Partner ID",
        description: "Please enter a valid 9-digit Partner ID.",
        variant: "destructive",
      });
    }
  };

  const formatInput = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 9);
    const formatted = cleaned.match(/.{1,3}/g)?.join(" ") || cleaned;
    setPartnerId(formatted);
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Quick Connect</h1>
          <p className="text-muted-foreground">
            Connect to a remote computer using their Partner ID
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Enter Partner ID</CardTitle>
            <CardDescription>
              Enter the 9-digit ID displayed on the remote computer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="partner-id">Partner ID</Label>
              <Input
                id="partner-id"
                placeholder="XXX XXX XXX"
                value={partnerId}
                onChange={(e) => formatInput(e.target.value)}
                className="font-mono text-center text-2xl tracking-widest"
                data-testid="input-partner-id"
              />
            </div>

            <div className="space-y-3">
              <Label>Connection Mode</Label>
              <RadioGroup
                value={connectionMode}
                onValueChange={(value: "remote" | "view") => setConnectionMode(value)}
                className="grid gap-3 sm:grid-cols-2"
              >
                <Label
                  htmlFor="remote-control"
                  className={`flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors ${
                    connectionMode === "remote" ? "border-primary bg-primary/5" : ""
                  }`}
                  data-testid="option-remote-control"
                >
                  <RadioGroupItem value="remote" id="remote-control" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Keyboard className="h-4 w-4" />
                      <span className="font-medium">Remote Assistance</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      View screen and guide with pointer
                    </p>
                  </div>
                </Label>

                <Label
                  htmlFor="view-only"
                  className={`flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors ${
                    connectionMode === "view" ? "border-primary bg-primary/5" : ""
                  }`}
                  data-testid="option-view-only"
                >
                  <RadioGroupItem value="view" id="view-only" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      <span className="font-medium">View Only</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Watch the screen without control
                    </p>
                  </div>
                </Label>
              </RadioGroup>
            </div>

            <Button
              className="w-full gap-2"
              size="lg"
              onClick={handleConnect}
              disabled={partnerId.replace(/\s/g, "").length < 9}
              data-testid="button-connect"
            >
              <span>Connect</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Monitor className="h-5 w-5 text-primary" />
            </div>
            <div className="text-sm">
              <p className="font-medium">Screen Sharing</p>
              <p className="text-muted-foreground">HD quality</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Keyboard className="h-5 w-5 text-primary" />
            </div>
            <div className="text-sm">
              <p className="font-medium">Pointer Overlay</p>
              <p className="text-muted-foreground">Guide remotely</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="text-sm">
              <p className="font-medium">Live Chat</p>
              <p className="text-muted-foreground">Communicate easily</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
