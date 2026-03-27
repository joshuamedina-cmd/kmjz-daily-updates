import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import AppLayout from "@/components/AppLayout";
import CreateUpdate from "@/pages/create-update";
import ViewUpdate from "@/pages/view-update";
import TodayRedirect from "@/pages/today-redirect";
import PublicView from "@/pages/public-view";
import AIEntry from "@/pages/ai-entry";
import ControlPanel from "@/pages/control-panel";
import NotFound from "@/pages/not-found";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={TodayRedirect} />
      <Route path="/new" component={AIEntry} />
      <Route path="/control" component={ControlPanel} />
      <Route path="/create" component={CreateUpdate} />
      <Route path="/update/:id" component={ViewUpdate} />
      <Route path="/view/:id" component={PublicView} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router hook={useHashLocation}>
            <AppLayout>
              <AppRouter />
            </AppLayout>
          </Router>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
