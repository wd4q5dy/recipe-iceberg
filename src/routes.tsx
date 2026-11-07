import type { ReactNode } from 'react';
import IcebergPage from './pages/IcebergPage';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  /** Accessible without login. Routes without this flag require authentication. Has no effect when RouteGuard is not in use. */
  public?: boolean;
}

export const routes: RouteConfig[] = [
  {
    name: 'Iceberg',
    path: '/',
    element: <IcebergPage />,
    public: true,
  },
];
