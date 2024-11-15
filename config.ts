import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  type Account,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, mainnet, optimism } from "viem/chains";
export const datilDev = defineChain({
  id: 175188,
  name: "yellowstone",
  nativeCurrency: { name: "Test LPX", symbol: "tstLPX", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://yellowstone-rpc.litprotocol.com"],
    },
  },
});

export const account = privateKeyToAccount(
  process.env.ETHEREUM_PRIVATE_KEY as `0x${string}`,
);

export const client = createPublicClient({
  chain: datilDev,
  transport: http(),
});

export const walletClient = createWalletClient({
  account,
  chain: datilDev,
  transport: http(),
});

export const createSourceWalletClient = (
  chain: "ethereum" | "base" | "optimism",
  account: Account,
) => {
  let walletClient;
  switch (chain) {
    case "base":
      walletClient = createWalletClient({
        account,
        chain: base,
        transport: http(),
      });
      break;
    case "optimism":
      walletClient = createWalletClient({
        account,
        chain: optimism,
        transport: http(),
      });
      break;
    default:
      walletClient = createWalletClient({
        account,
        chain: mainnet,
        transport: http(),
      });
      break;
  }

  return walletClient;
};
