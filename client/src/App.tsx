import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import QuickConnect from "@/pages/quick-connect";
import RecentSessions from "@/pages/recent-sessions";
import SavedConnections from "@/pages/saved-connections";
import FileTransfers from "@/pages/file-transfers";
import SettingsPage from "@/pages/settings";
import HelpPage from "@/pages/help";
import SessionPage from "@/pages/session";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/connect" component={QuickConnect} />
      <Route path="/recent" component={RecentSessions} />
      <Route path="/saved" component={SavedConnections} />
      <Route path="/transfers" component={FileTransfers} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/help" component={HelpPage} />
      <Route path="/session" component={SessionPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex flex-1 flex-col overflow-hidden">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="remotedesk-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppLayout />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
