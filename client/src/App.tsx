import { Navigate, Route, Routes } from 'react-router-dom';
import { DirectorShell } from './components/DirectorShell';
import { DashboardPage } from './pages/DashboardPage';
import { ShowsPage } from './pages/ShowsPage';
import { ShowDetailPage } from './pages/ShowDetailPage';
import { StagesPage } from './pages/StagesPage';
import { StageBuilderPage } from './pages/StageBuilderPage';
import { CrewPage } from './pages/CrewPage';
import { LivePage } from './pages/LivePage';
import { OperatorPage } from './pages/OperatorPage';
import { ShotLibraryPage } from './pages/ShotLibraryPage';

export function App() {
  return (
    <Routes>
      {/* Camera operator mode runs full screen on the iPad. */}
      <Route path="/operator" element={<OperatorPage />} />
      <Route path="/operator/:showId" element={<OperatorPage />} />

      <Route element={<DirectorShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/shows" element={<ShowsPage />} />
        <Route path="/shows/:showId" element={<ShowDetailPage />} />
        <Route path="/stages" element={<StagesPage />} />
        <Route path="/stages/:stageId" element={<StageBuilderPage />} />
        <Route path="/crew" element={<CrewPage />} />
        <Route path="/shots" element={<ShotLibraryPage />} />
        <Route path="/live/:showId" element={<LivePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
