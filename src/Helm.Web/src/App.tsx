import { Admin } from 'react-admin';
import { Projections } from './pages/Projections';
import { dataProvider } from './dataProvider';

const App = () => (
  <Admin dataProvider={dataProvider} dashboard={Projections} requireAuth={false} />
);

export default App;
