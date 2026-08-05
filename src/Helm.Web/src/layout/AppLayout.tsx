import { Layout } from 'react-admin';
import type { LayoutProps } from 'react-admin';
import { AppMenu } from './AppMenu';

export const AppLayout = (props: LayoutProps) => (
  <Layout {...props} menu={AppMenu} />
);

export default AppLayout;
