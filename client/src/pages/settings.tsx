import { useState, useEffect } from "react";
import { Monitor, Globe, Shield, Keyboard, Volume2, Bell, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/theme-provider";
import { getDeviceInfo, formatPartnerId } from "@/lib/device-store";
import { useToast } from "@/hooks/use-toast";
import type { Device } from "@shared/schema";

interface Settings {
  quality: "auto" | "high" | "medium" | "low";
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  startMinimized: boolean;
  autoConnect: boolean;
  clipboardSync: boolean;
  showPointer: boolean;
  bandwidth: number;
}

const defaultSettings: Settings = {
  quality: "auto",
  soundEnabled: true,
  notificationsEnabled: true,
  startMinimized: false,
  autoConnect: false,
  clipboardSync: true,
  showPointer: true,
  bandwidth: 100,
};

export default function SettingsPage() {
  const [device, setDevice] = useState<Device | null>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  useEffect(() => {
    setDevice(getDeviceInfo());
    const stored = localStorage.getItem("remotedesk-settings");
    if (stored) {
      setSettings({ ...defaultSettings, ...JSON.parse(stored) });
    }
  }, []);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem("remotedesk-settings", JSON.stringify(newSettings));
  };

  const handleSaveDeviceName = (name: string) => {
    if (device) {
      const updatedDevice = { ...device, name };
      localStorage.setItem("remotedesk-device", JSON.stringify(updatedDevice));
      setDevice(updatedDevice);
      toast({
        title: "Device name updated",
        description: "Your device name has been saved.",
      });
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Settings</h1>
          <p className="text-muted-foreground">
            Configure your remote desktop preferences
          </p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4" data-testid="tabs-settings">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="quality">Quality</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="shortcuts">Shortcuts</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Device Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="device-name">Device Name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="device-name"
                      defaultValue={device?.name || ""}
                      placeholder="Enter device name"
                      data-testid="input-device-name"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        const input = document.getElementById("device-name") as HTMLInputElement;
                        handleSaveDeviceName(input.value);
                      }}
                      data-testid="button-save-name"
                    >
                      Save
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Your Partner ID</Label>
                  <div className="rounded-md border bg-muted/50 px-4 py-3">
                    <span className="font-mono text-lg" data-testid="text-partner-id">
                      {device ? formatPartnerId(device.partnerId) : "---  ---  ---"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label>Theme</Label>
                    <p className="text-sm text-muted-foreground">
                      Choose your preferred color scheme
                    </p>
                  </div>
                  <Select
                    value={theme}
                    onValueChange={(value: "light" | "dark" | "system") => setTheme(value)}
                    data-testid="select-theme"
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label>Enable notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about connection requests
                    </p>
                  </div>
                  <Switch
                    checked={settings.notificationsEnabled}
                    onCheckedChange={(checked) => updateSetting("notificationsEnabled", checked)}
                    data-testid="switch-notifications"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label>Sound alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Play sound when receiving connections
                    </p>
                  </div>
                  <Switch
                    checked={settings.soundEnabled}
                    onCheckedChange={(checked) => updateSetting("soundEnabled", checked)}
                    data-testid="switch-sound"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quality" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Connection Quality
                </CardTitle>
                <CardDescription>
                  Adjust streaming quality based on your connection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Quality preset</Label>
                  <Select
                    value={settings.quality}
                    onValueChange={(value: Settings["quality"]) => updateSetting("quality", value)}
                    data-testid="select-quality"
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (Recommended)</SelectItem>
                      <SelectItem value="high">High Quality</SelectItem>
                      <SelectItem value="medium">Balanced</SelectItem>
                      <SelectItem value="low">Low Bandwidth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <Label>Bandwidth limit</Label>
                    <span className="text-sm text-muted-foreground">{settings.bandwidth}%</span>
                  </div>
                  <Slider
                    value={[settings.bandwidth]}
                    onValueChange={([value]) => updateSetting("bandwidth", value)}
                    max={100}
                    min={10}
                    step={10}
                    data-testid="slider-bandwidth"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5" />
                  Audio & Visuals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label>Show remote pointer</Label>
                    <p className="text-sm text-muted-foreground">
                      Display pointer position from remote viewer
                    </p>
                  </div>
                  <Switch
                    checked={settings.showPointer}
                    onCheckedChange={(checked) => updateSetting("showPointer", checked)}
                    data-testid="switch-pointer"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label>Clipboard synchronization</Label>
                    <p className="text-sm text-muted-foreground">
                      Sync clipboard between devices
                    </p>
                  </div>
                  <Switch
                    checked={settings.clipboardSync}
                    onCheckedChange={(checked) => updateSetting("clipboardSync", checked)}
                    data-testid="switch-clipboard"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Access Control
                </CardTitle>
                <CardDescription>
                  Configure security settings for remote connections
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label>Auto-accept connections</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically accept connection requests (not recommended)
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoConnect}
                    onCheckedChange={(checked) => updateSetting("autoConnect", checked)}
                    data-testid="switch-auto-connect"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shortcuts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Keyboard className="h-5 w-5" />
                  Keyboard Shortcuts
                </CardTitle>
                <CardDescription>
                  Quick actions during remote sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { action: "Toggle fullscreen", shortcut: "F11" },
                    { action: "Open chat", shortcut: "Ctrl + Shift + C" },
                    { action: "Toggle pointer", shortcut: "Ctrl + Shift + P" },
                    { action: "File transfer", shortcut: "Ctrl + Shift + F" },
                    { action: "End session", shortcut: "Ctrl + Shift + E" },
                  ].map((item) => (
                    <div
                      key={item.action}
                      className="flex items-center justify-between gap-4 rounded-md border p-3"
                    >
                      <span className="text-sm">{item.action}</span>
                      <kbd className="rounded bg-muted px-2 py-1 font-mono text-xs">
                        {item.shortcut}
                      </kbd>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
