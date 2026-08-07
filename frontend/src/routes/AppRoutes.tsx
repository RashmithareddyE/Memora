import { Routes, Route } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import LandingPage from '../pages/LandingPage';

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<LandingPage />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;