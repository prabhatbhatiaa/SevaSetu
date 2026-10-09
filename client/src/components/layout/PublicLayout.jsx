import { Outlet } from 'react-router-dom';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

/** Frame for public pages other than the landing page. */
export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 pb-20 pt-24 sm:pt-28">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
