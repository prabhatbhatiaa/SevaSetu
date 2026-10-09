import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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

/**
 * The landing page. Several sections carry their own small 3D scene, all
 * drawn from the same points of light and palette so they read as one story:
 * the bridge, lost messages, a pin, a route, an orbit, a skyline, the bridge.
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
      <SiteHeader />
      <ActRail />

      <main>
        <Hero impact={impact} />
        <Problem />
        <Promise />
        <RequestJourney />
        <Categories impact={impact} />
        <MatchingEngine />
        <Roles />
        <ImpactStrip summary={impact?.summary} recent={impact?.recentImpactFeed} />
        <ClosingCta />
      </main>

      <SiteFooter />
    </div>
  );
}
