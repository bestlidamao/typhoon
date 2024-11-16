import { createPublicClient, defineChain, http, toBytes } from "viem";
import { PKPPremissionsContract } from "../abi/PKPPermissions";
import bs58 from "bs58";
import { PKPNFTContract } from "../abi/PKPNFT";

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

export const client = createPublicClient({
  chain: datilDev,
  transport: http(),
});

export const getPKPCid = async (tokenId: bigint) => {
  const PKPAuthMothods = await client.readContract({
    ...PKPPremissionsContract,
    functionName: "getPermittedAuthMethods",
    args: [tokenId],
  });

  if (PKPAuthMothods.length !== 1) {
    throw new Error("PKP Auth Error");
  }

  return bs58.encode(toBytes(PKPAuthMothods[0].id));
};

export const getPKPPublicKey = async (tokenId: bigint) => {
  const PKPPublicKey = await client.readContract({
    ...PKPNFTContract,
    functionName: "getPubkey",
    args: [tokenId],
  });

  return PKPPublicKey;
};
