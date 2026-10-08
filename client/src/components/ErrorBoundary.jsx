import { Component } from 'react';
import { Button, LogoMark } from './ui';

/**
 * Catches render errors (including failed lazy-loaded chunks) below it.
 * Pass `fallback={null}` for decorative content that can simply disappear.
 * When `resetKey` changes (e.g. the route), a previous error is cleared.
 */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(previousProps) {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error, info) {
    console.error('[SevaSetu] Something failed to render:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return this.props.fallback !== undefined ? this.props.fallback : <PageError />;
  }
}

function PageError() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <LogoMark className="h-10 w-10 text-ink" />
      <h1 className="heading mt-8 text-3xl">This page didn’t load.</h1>
      <p className="mt-3 max-w-sm text-muted">
        It’s usually a connection hiccup, or a new version of SevaSetu was just released. Reloading should fix it.
      </p>
      <div className="mt-8 flex gap-3">
        <Button variant="primary" onClick={() => window.location.reload()}>
          Reload page
        </Button>
        <Button to="/" onClick={() => window.location.assign('/')}>
          Go home
        </Button>
      </div>
    </div>
  );
}
