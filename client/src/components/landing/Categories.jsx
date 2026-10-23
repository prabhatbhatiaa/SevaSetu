import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { TiltCard, cn } from '../ui';
import { CATEGORIES } from '../../lib/constants';
import { pluralize } from '../../lib/format';

/** Act five: a bento of every kind of help, with live request counts. */
export function Categories({ impact }) {
  const totals = Object.fromEntries((impact?.categories ?? []).map((item) => [item.category, item.total]));

  return (
    <section id="categories" data-act="categories" className="scroll-mt-16 py-10 sm:py-16 lg:py-20">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-4 sm:gap-6">
          <div>
            <p className="eyebrow reveal">What people ask for</p>
            <h2 className="display reveal mt-3 sm:mt-4 text-[30px] sm:text-5xl lg:text-6xl leading-[1.12]">
              Ten kinds of help. <em>One</em> place to ask.
            </h2>
          </div>
          <Link
            to="/requests/explore"
            className="reveal inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-opacity hover:opacity-70"
          >
            Browse open requests <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Link>
        </div>

        <ul className="mt-6 sm:mt-8 grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4">
          {CATEGORIES.map((category, index) => {
            const featured = index < 2;
            const count = totals[category.name] ?? 0;
            return (
              <li
                key={category.name}
                className={cn('reveal', featured && 'col-span-2 md:row-span-2')}
                style={{ '--delay': `${(index % 4) * 70}ms` }}
              >
                <TiltCard
                  as={Link}
                  to={`/requests/explore?category=${encodeURIComponent(category.name)}`}
                  className="group flex h-full min-h-[120px] sm:min-h-[150px] flex-col rounded-xl sm:rounded-2xl border bg-surface p-3.5 sm:p-5 hover:border-strong transition-all"
                >
                  <div className="flex items-start justify-between">
                    <span className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border bg-canvas/60">
                      <category.icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={1.75} />
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-subtle transition-colors group-hover:text-ink" />
                  </div>
                  <h3
                    className={cn(
                      'mt-auto pt-4 sm:pt-6 font-medium leading-tight tracking-tight',
                      featured ? 'text-lg sm:text-3xl' : 'text-sm sm:text-lg',
                    )}
                  >
                    {category.name}
                  </h3>
                  {featured && <p className="mt-2 sm:mt-3 max-w-xs text-xs sm:text-[15px] leading-relaxed text-muted">{category.blurb}</p>}
                  <p className="mt-2 sm:mt-3 text-[11px] sm:text-xs text-subtle">
                    {count ? `${pluralize(count, 'request')} so far` : 'Be the first to ask'}
                  </p>
                </TiltCard>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
