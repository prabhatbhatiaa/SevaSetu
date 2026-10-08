import { SceneBanner } from '../three/SceneBanner';

/**
 * Page title block. Titles can contain an <em> for the saffron serif accent.
 * `scene` puts the header on a panel with the live 3D bridge on the right;
 * the text and actions then stay in the left column, clear of the bridge.
 */
export function PageHeader({ eyebrow, title, description, actions, scene = false }) {
  const text = (
    <>
      {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
      <h1 className="heading text-3xl sm:text-[42px]">{title}</h1>
      {description && <p className="mt-3 text-[15px] leading-relaxed text-muted">{description}</p>}
    </>
  );

  if (scene) {
    return (
      <header className="mb-8">
        <SceneBanner className="min-h-[240px]">
          <div className="md:max-w-[46%]">
            {text}
            {actions && <div className="mt-6 flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
        </SceneBanner>
      </header>
    );
  }

  return (
    <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-xl">{text}</div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
