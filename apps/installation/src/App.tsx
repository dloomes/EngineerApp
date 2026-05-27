import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from '@involve/ui';
import { AppLauncher } from '@/screens/AppLauncher';
import { ComingSoon } from '@/screens/ComingSoon';
import { JobLookup } from '@/screens/JobLookup';
import { OpportunityLines } from '@/screens/OpportunityLines';
import { LocationStep } from '@/screens/LocationStep';
import { AssetDetails } from '@/screens/AssetDetails';
import { Confirmation } from '@/screens/Confirmation';

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Layout appName="Engineer Apps">
              <AppLauncher />
            </Layout>
          }
        />
        <Route
          path="/installation"
          element={
            <Layout appName="Installation">
              <JobLookup />
            </Layout>
          }
        />
        <Route
          path="/installation/lines"
          element={
            <Layout appName="Installation">
              <OpportunityLines />
            </Layout>
          }
        />
        <Route
          path="/installation/location"
          element={
            <Layout appName="Installation">
              <LocationStep />
            </Layout>
          }
        />
        <Route
          path="/installation/asset/:index"
          element={
            <Layout appName="Installation">
              <AssetDetails />
            </Layout>
          }
        />
        <Route
          path="/installation/confirmation"
          element={
            <Layout appName="Installation">
              <Confirmation />
            </Layout>
          }
        />
        <Route
          path="/health-check"
          element={
            <Layout appName="Health Check">
              <ComingSoon appName="Health Check" />
            </Layout>
          }
        />
        <Route
          path="/fsr"
          element={
            <Layout appName="FSR">
              <ComingSoon appName="FSR" />
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
