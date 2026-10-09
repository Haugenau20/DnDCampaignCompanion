// functions/src/operator/dev.ts
//
// `npm run operator:dev`: the real operator server, against the emulators
// (T137; design, "Local development"). It makes a throwaway key pair and
// signs an identity header onto every request in-process, so the real
// verifier runs with only its keys and audience swapped. Never in the image
// (`.dockerignore`), and it refuses to start anywhere but beside the
// emulators.

import {randomBytes} from "node:crypto";
import {createServer} from "node:http";
import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import {createDevSigner} from "./devSigner";
import {IAP_HEADER} from "./http/identity";
import {createOperatorHandler} from "./http/server";

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST ||
    process.env.K_SERVICE) {
  process.stderr.write(
    "operator:dev runs only against the emulators: FIRESTORE_EMULATOR_HOST and " +
    "FIREBASE_AUTH_EMULATOR_HOST must be set, and K_SERVICE (Cloud Run) must not.\n"
  );
  process.exit(1);
}

const port = Number(process.env.OPERATOR_PORT ?? "4700");
const operator = {
  sub: "accounts.google.com:dev-operator",
  email: process.env.OPERATOR_DEV_EMAIL ?? "operator@dev.local",
};
const audience = "/projects/0/locations/local/services/operator-dev";
const signer = createDevSigner();

initializeApp({projectId: process.env.GCLOUD_PROJECT ?? "dnd-campaign-companion"});
const handler = createOperatorHandler({
  db: getFirestore(),
  auth: getAuth(),
  identity: {audience, subjects: new Set([operator.sub]), keys: async () => signer.keys},
  csrfKey: randomBytes(32),
  siteOrigin: process.env.SITE_ORIGIN ?? "http://localhost:3000",
});

createServer((req, res) => {
  // Every request is the dev operator, as IAP would say it.
  req.headers[IAP_HEADER] = signer.assertion({...operator, aud: audience});
  void handler(req, res);
}).listen(port, "127.0.0.1", () => {
  process.stdout.write(`Operator page (dev) on http://127.0.0.1:${port}, as ${operator.email}.\n`);
});
