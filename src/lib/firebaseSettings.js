export const LOCAL_PROJECT_ID = "demo-fola";
export const LIVE_HOSTS = Object.freeze([
  "lemoha.co.za", "www.lemoha.co.za", "vot-health-za.web.app", "vot-health-za.firebaseapp.com",
]);

// These identify an emulator-only app; none are copied from the live config.
export const emulatorConfig = Object.freeze({
  apiKey: "demo-key", authDomain: "127.0.0.1", projectId: LOCAL_PROJECT_ID,
  storageBucket: "demo-fola.invalid", messagingSenderId: "000000000000", appId: "demo-fola-web",
});

export function shouldUseEmulators(hostname, dev) {
  const host = String(hostname).toLowerCase().replace(/\.$/, "");
  return Boolean(dev) || !LIVE_HOSTS.includes(host);
}

// Firestore's transport can ping an external image after a connection failure.
// Fence browser traffic as well as project selection in local mode.
export function installLocalNetworkPolicy(document) {
  const policy = document.createElement("meta");
  policy.httpEquiv = "Content-Security-Policy";
  const local = "'self' http://127.0.0.1:* http://localhost:*";
  policy.content = `connect-src ${local} ws://127.0.0.1:* ws://localhost:*; img-src ${local} data: blob:; frame-src ${local}`;
  document.head.append(policy);
}
