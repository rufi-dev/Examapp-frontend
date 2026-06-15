import React from "react";

// Generic error boundary so a crash in one widget (e.g. the Google Sign-In
// button when Google's GSI script is blocked) doesn't take down the whole page.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    // Log but don't rethrow — the fallback UI is shown instead.
    console.warn("ErrorBoundary caught an error:", error?.message || error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
