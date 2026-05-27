import type { ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from '@involve/ui';
import { OfflineBanner } from '@/components/OfflineBanner';
import { AppLauncher } from '@/screens/AppLauncher';
import { ComingSoon } from '@/screens/ComingSoon';
import { JobLookup } from '@/screens/JobLookup';
import { OpportunityLines } from '@/screens/OpportunityLines';
import { LocationStep } from '@/screens/LocationStep';
import { AssetDetails } from '@/screens/AssetDetails';
import { Confirmation } from '@/screens/Confirmation';

// Wraps each screen in the shared layout with the app name + the offline/sync
// banner, so connectivity status shows on every screen.
function Shell({
  appName,
  children,
}: {
  appName: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <Layout appName={appName} banner={<OfflineBanner />}>
      {children}
    </Layout>
  );
}

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Shell appName="Engineer Apps">
              <AppLauncher />
            </Shell>
          }
        />
        <Route
          path="/installation"
          element={
            <Shell appName="Installation">
              <JobLookup />
            </Shell>
          }
        />
        <Route
          path="/installation/lines"
          element={
            <Shell appName="Installation">
              <OpportunityLines />
            </Shell>
          }
        />
        <Route
          path="/installation/location"
          element={
            <Shell appName="Installation">
              <LocationStep />
            </Shell>
          }
        />
        <Route
          path="/installation/asset/:index"
          element={
            <Shell appName="Installation">
              <AssetDetails />
            </Shell>
          }
        />
        <Route
          path="/installation/confirmation"
          element={
            <Shell appName="Installation">
              <Confirmation />
            </Shell>
          }
        />
        <Route
          path="/health-check"
          element={
            <Shell appName="Health Check">
              <ComingSoon appName="Health Check" />
            </Shell>
          }
        />
        <Route
          path="/fsr"
          element={
            <Shell appName="FSR">
              <ComingSoon appName="FSR" />
            </Shell>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
