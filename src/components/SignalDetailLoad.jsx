import { Component, lazy, Suspense } from "react";
import { loadSignalDetail } from "../lib/loadSignalDetail";
import { BANNER } from "../lib/replayText";
import Message from "./Message";

class DetailBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false, Screen: lazy(props.load) };
  }

  static getDerivedStateFromError() { return { failed: true }; }

  retry = () => {
    // React.lazy also caches rejected promises. Retry with a fresh lazy component.
    this.setState({ failed: false, Screen: lazy(this.props.load) });
  };

  render() {
    if (this.state.failed) return <section className="screen"><p className="pill">{BANNER}</p><Message kind="error" role="alert">Signal detail couldn't load. Check your connection, then try again.</Message><button type="button" className="button button-primary" onClick={this.retry}>Try again</button><button type="button" className="button button-secondary" onClick={this.props.detailProps.onBack}>Back</button></section>;
    const { Screen } = this.state;
    return <Suspense fallback={<section className="screen"><p className="pill">{BANNER}</p><p role="status">Loading signal…</p></section>}><Screen {...this.props.detailProps} /></Suspense>;
  }
}

export default function SignalDetailLoad({ load = loadSignalDetail, ...detailProps }) {
  return <DetailBoundary load={load} detailProps={detailProps} />;
}
