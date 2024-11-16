import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { TappdClient } from "@phala/dstack-sdk";
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  parseEther,
  verifyMessage,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { Database } from "bun:sqlite";
import { getSourceChain } from "../commands/tools";

const endpoint =
  process.env.DSTACK_SIMULATOR_ENDPOINT || "http://localhost:8090";
const db = new Database();
const init = db.query(`
  CREATE TABLE order_table (
      nonce text PRIMARY KEY NOT NULL,
      source text NOT NULL,
      destin text NOT NULL,
      destin_address text NOT NULL,
      value text NOT NULL,
      create_date text NOT NULL
  );
`);
init.run();

const app = new Hono()
  .post(
    "/create",
    zValidator(
      "json",
      z.object({
        nonce: z.string(),
        source: z.string(),
        destin: z.string(),
        destinAddress: z.string(),
        value: z.number(),
      }),
    ),
    async (c) => {
      const { nonce, source, destin, destinAddress, value } =
        c.req.valid("json");

      const client = new TappdClient(endpoint);
      const testDeriveKey = await client.deriveKey(`/${nonce}`, "test");
      const keccakPrivateKey = keccak256(testDeriveKey.asUint8Array());
      const account = privateKeyToAccount(keccakPrivateKey);

      const creatQuery = db.query(`
      INSERT INTO
          "order_table" (
              "nonce",
              "source",
              "destin",
              "destin_address",
              "value",
              "create_date"
          )
      VALUES
          ($nonce, $source, $destin, $destinAddress, $value, $createDate);
    `);

      creatQuery.run({
        $nonce: nonce,
        $source: source,
        $destin: destin,
        $destinAddress: destinAddress,
        $value: value,
        $createDate: new Date().toISOString(),
      });

      return c.json({ account: account.address });
    },
  )
  .post(
    "/fill",
    zValidator(
      "json",
      z.object({
        txHash: z.string(),
        nonce: z.string(),
        signature: z.string(),
        receiver: z.string(),
        value: z.string(),
      }),
    ),
    async (c) => {
      const { nonce, txHash, signature, receiver, value } = c.req.valid("json");

      const query = db.query("SELECT * FROM order_table WHERE nonce = $nonce");
      const order = query.get() as any;

      const client = createPublicClient({
        chain: getSourceChain(order.destin),
        transport: http(),
      });

      const nowBlockNumber = await client.getBlockNumber();
      const tx = await client.getTransaction({
        hash: txHash as `0x${string}`,
      });

      try {
        if (nowBlockNumber - tx.blockNumber < BigInt(5)) {
          throw new Error("Confirmed Error");
        }

        if (tx.to !== order.destin_address) {
          throw new Error("Receiver Address Err");
        }

        if (tx.value < parseEther(order.value)) {
          throw new Error("Receiver Amount Err");
        }

        if (tx.input !== order.nonce) throw new Error("Confirm Nonce Error");

        const valid = await verifyMessage({
          address: tx.from,
          message: txHash,
          signature: signature as `0x${string}`,
        });

        if (!valid) {
          throw new Error("TxHash Sign Err");
        }
      } catch (e) {
        return c.json({ success: false, msg: (e as Error).message }, 400);
      }

      const tappdClient = new TappdClient(endpoint);
      const testDeriveKey = await tappdClient.deriveKey(`/${nonce}`, "test");
      const keccakPrivateKey = keccak256(testDeriveKey.asUint8Array());
      const account = privateKeyToAccount(keccakPrivateKey);

      const walletClient = createWalletClient({
        account,
        chain: getSourceChain(order.destin),
        transport: http(),
      });

      const request = await walletClient.prepareTransactionRequest({
        account,
        to: receiver as `0x${string}`,
        value: parseEther(value),
      });

      const serializedTransaction = await walletClient.signTransaction(request);

      const hash = await walletClient.sendRawTransaction({
        serializedTransaction,
      });

      return c.json({ tx: hash });
    },
  )
  .get(
    "/order/:nonce",
    zValidator(
      "param",
      z.object({
        nonce: z.string(),
      }),
    ),
    async (c) => {
      const { nonce } = c.req.valid("param");
      const query = db.query("SELECT * FROM order_table WHERE nonce = $nonce");
      const results = query.get({
        $nonce: nonce,
      });

      const client = new TappdClient(endpoint);
      const testDeriveKey = await client.deriveKey(`/${nonce}`, "test");
      const keccakPrivateKey = keccak256(testDeriveKey.asUint8Array());
      const account = privateKeyToAccount(keccakPrivateKey);

      return c.json({
        ...(results as any),
        account: account.address,
      });
    },
  );

export default app;
export type AppType = typeof app;
