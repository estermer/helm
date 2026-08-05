import { Admin, CustomRoutes } from 'react-admin';
import { Route } from 'react-router-dom';
import { Projections } from './pages/Projections';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { AppLayout } from './layout/AppLayout';
import { dataProvider } from './dataProvider';

const App = () => (
  <Admin
    dataProvider={dataProvider}
    dashboard={Dashboard}
    requireAuth={false}
    layout={AppLayout}
    loginPage={false}
  >
    <CustomRoutes>
      <Route path="/calculator" element={<Projections />} />
      <Route path="/login" element={<Login />} />
    </CustomRoutes>
  </Admin>
);

export default App;
