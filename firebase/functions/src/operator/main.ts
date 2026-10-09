// functions/src/operator/main.ts
//
// The operator service's production entry point (T137). Its keys are Google's
// published IAP keys and nothing else; there is no setting that changes them
// or the audience. The development entry point that does is `dev.ts`, which
// `.dockerignore` keeps out of the image.

import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import {OperatorConfig, readConfig} from "./config";
import {iapKeyStore} from "./http/identity";
import {createOperatorServer} from "./http/server";

let config: OperatorConfig;
try {
  config = readConfig(process.env);
} catch (error) {
  process.stderr.write(`${(error as Error).message}\n`);
  process.exit(1);
}

initializeApp();
createOperatorServer({
  db: getFirestore(),
  auth: getAuth(),
  identity: {audience: config.audience, subjects: config.subjects, keys: iapKeyStore()},
  csrfKey: config.csrfKey,
  siteOrigin: config.siteOrigin,
}).listen(config.port, () => {
  process.stdout.write(`Operator service listening on ${config.port}.\n`);
});
