import { Component } from "react";
import { PRODUCT_NAME } from "../config/product";
import Message from "./Message";
import Wordmark from "./Wordmark";

// Screens load their code as separate files. If one can't be fetched (no
// connection, or a tab left open from before a deploy, whose old files are
// gone), say so and offer a reload instead of leaving a blank page.
export default class LoadFailed extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="center-screen">
        <p className="auth-wordmark"><Wordmark size="large" /></p>
        <Message kind="error" role="alert">{PRODUCT_NAME} couldn't load this screen. Check your connection, then reload the page.</Message>
        <button type="button" className="button button-primary" onClick={() => window.location.reload()}>Reload the page</button>
      </main>
    );
  }
}
