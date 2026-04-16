import { useEffect, useRef } from "react";
import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import AppLayout from "@/components/layout/AppLayout";

import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import LeadsPage from "@/pages/leads";
import LeadDetailPage from "@/pages/leads/[id]";
import CampaignsPage from "@/pages/campaigns";
import CampaignDetailPage from "@/pages/campaigns/[id]";
import FunnelSettingsPage from "@/pages/settings/funnel";
import FieldsSettingsPage from "@/pages/settings/fields";
import OnboardingPage from "@/pages/onboarding";
import NotFound from "@/pages/not-found";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function QueryCacheInvalidatorOnAuthChange() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const userId = user?.id ?? null;
    if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
      qc.clear();
    }
    prevUserIdRef.current = userId;
  }, [user, qc]);

  return null;
}

function AuthTokenWirer() {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(getToken);
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  return null;
}

function RedirectTo({ path }: { path: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation(path); }, [path, setLocation]);
  return null;
}

function AuthenticatedApp() {
  return (
    <WorkspaceProvider>
      <Switch>
        <Route path="/onboarding" component={OnboardingPage} />
        <Route path="/*">
          <AppLayout>
            <Switch>
              <Route path="/dashboard" component={DashboardPage} />
              <Route path="/leads" component={LeadsPage} />
              <Route path="/leads/:id" component={LeadDetailPage} />
              <Route path="/campaigns" component={CampaignsPage} />
              <Route path="/campaigns/:id" component={CampaignDetailPage} />
              <Route path="/settings/funnel" component={FunnelSettingsPage} />
              <Route path="/settings/fields" component={FieldsSettingsPage} />
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        </Route>
      </Switch>
    </WorkspaceProvider>
  );
}

function AppRoutes() {
  const { user, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/sign-in" component={SignInPage} />
        <Route path="/sign-up" component={SignUpPage} />
        <Route>
          <LandingPage />
        </Route>
      </Switch>
    );
  }

  return (
    <>
      <AuthTokenWirer />
      <Switch>
        <Route path="/" component={() => <RedirectTo path="/dashboard" />} />
        <Route path="/sign-in" component={() => <RedirectTo path="/dashboard" />} />
        <Route path="/sign-up" component={() => <RedirectTo path="/dashboard" />} />
        <Route path="/*">
          <AuthenticatedApp />
        </Route>
      </Switch>
    </>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <QueryCacheInvalidatorOnAuthChange />
            <AppRoutes />
          </QueryClientProvider>
        </AuthProvider>
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
