import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { TiltCard, cn } from '../ui';
import { CATEGORIES } from '../../lib/constants';
import { pluralize } from '../../lib/format';

/** Act five: a bento of every kind of help, with live request counts. */
export function Categories({ impact }) {
  const totals = Object.fromEntries((impact?.categories ?? []).map((item) => [item.category, item.total]));

  return (
    <section id="categories" data-act="categories" className="scroll-mt-16 py-16 sm:py-20">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow reveal">What people ask for</p>
            <h2 className="display reveal mt-4 text-[44px] sm:text-6xl">
              Ten kinds of help. <em>One</em> place to ask.
            </h2>
          </div>
          <Link
            to="/requests/explore"
            className="reveal inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70"
          >
            Browse open requests <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
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
                  className="group flex h-full min-h-[150px] flex-col rounded-2xl border bg-surface p-5 hover:border-strong"
                >
                  <div className="flex items-start justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border">
                      <category.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-subtle transition-colors group-hover:text-ink" />
                  </div>
                  <h3
                    className={cn(
                      'mt-auto pt-6 font-medium leading-tight tracking-tight',
                      featured ? 'text-3xl sm:text-4xl' : 'text-lg',
                    )}
                  >
                    {category.name}
                  </h3>
                  {featured && <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-muted">{category.blurb}</p>}
                  <p className="mt-3 text-xs text-subtle">
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
