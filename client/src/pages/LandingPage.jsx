import { lazy, Suspense, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { SiteHeader } from '../components/layout/SiteHeader';
import { SiteFooter } from '../components/layout/SiteFooter';
import { ActRail } from '../components/landing/ActRail';
import { Hero } from '../components/landing/Hero';
import { Problem } from '../components/landing/Problem';
import { Promise } from '../components/landing/Promise';
import { RequestJourney } from '../components/landing/RequestJourney';
import { Categories } from '../components/landing/Categories';
import { MatchingEngine } from '../components/landing/MatchingEngine';
import { Roles } from '../components/landing/Roles';
import { ImpactStrip } from '../components/landing/ImpactStrip';
import { ClosingCta } from '../components/landing/ClosingCta';
import api from '../lib/api';
import { useDocumentTitle, useFetch, useReveal } from '../lib/hooks';

// three.js is heavy, so the scene loads after the page itself.
const BridgeScene = lazy(() => import('../components/three/BridgeScene'));

/**
 * The landing page is one continuous scene: the 3D bridge sits behind every
 * section, and each `[data-act]` section moves the camera to its own view.
 */
export default function LandingPage() {
  const rootRef = useRef(null);
  const { hash } = useLocation();
  useDocumentTitle();

  // Live numbers are a nice-to-have: if the API is down the page still works.
  const { data: impact } = useFetch(async () => (await api.get('/public/impact')).data.data, []);
  useReveal(rootRef, [Boolean(impact)]);

  // Support links like /#matching coming from other pages.
  useEffect(() => {
    if (!hash) return;
    const target = document.querySelector(hash);
    if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth' }));
  }, [hash]);

  return (
    <div ref={rootRef} className="relative">
      <div className="pointer-events-none fixed inset-0 z-0">
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <BridgeScene mode="landing" />
          </Suspense>
        </ErrorBoundary>
      </div>

      <SiteHeader overHero />
      <ActRail />

      <main className="relative z-10">
        <Hero impact={impact} />
        <Problem />
        <Promise />
        <RequestJourney />
        <Categories impact={impact} />
        <MatchingEngine />
        <Roles />
        <ImpactStrip summary={impact?.summary} />
        <ClosingCta />
      </main>

      <div className="relative z-10 bg-canvas">
        <SiteFooter />
      </div>
    </div>
  );
}
