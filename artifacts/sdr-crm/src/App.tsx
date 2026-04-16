import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
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

const queryClient = new QueryClient();

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

function SignInPage() {
  // To update login providers, app branding, or OAuth settings use the Auth pane in the workspace toolbar.
  return (
    <div className="flex justify-center items-center min-h-screen bg-muted/30">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  // To update login providers, app branding, or OAuth settings use the Auth pane in the workspace toolbar.
  return (
    <div className="flex justify-center items-center min-h-screen bg-muted/30">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function HomeRedirect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Show renders its children conditionally, but we need an effect to navigate.
    // However, it's simpler to just let Show render a component that redirects.
  }, []);

  return (
    <>
      <Show when="signed-in">
        <RedirectToDashboard />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function RedirectToDashboard() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/dashboard");
  }, [setLocation]);
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

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/*">
            <Show when="signed-in">
              <AuthenticatedApp />
            </Show>
            <Show when="signed-out">
              <LandingPage />
            </Show>
          </Route>
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
