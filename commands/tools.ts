import {
  createWalletClient,
  formatEther,
  http,
  parseEther,
  parseEventLogs,
  type Account,
  type Chain,
  type WalletClient,
} from "viem";
import { privateKeyToAccount, publicKeyToAddress } from "viem/accounts";
import { generateSiweNonce } from "viem/siwe";
import { client, datilDev } from "../config";
import { PKPNFTContract } from "../abi/PKPNFT";
import bs58 from "bs58";
import { getTransactionReceipt } from "viem/actions";
import { PubKeyRouterABI } from "../abi/PubKeyRouter";
import { arbitrumSepolia, base, mainnet, optimism, sepolia } from "viem/chains";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LitNetwork } from "@lit-protocol/constants";
import { getPKPCid, getPKPPublicKey } from "./util";
import {
  createSiweMessage,
  // createSiweMessageWithRecaps,
  generateAuthSig,
  LitAbility,
  LitActionResource,
  LitPKPResource,
} from "@lit-protocol/auth-helpers";

type SupportChain =
  | "ethereum"
  | "base"
  | "optimism"
  | "sepolia"
  | "arbitrumSepolia";

export const getSourceChain = (chain: SupportChain) => {
  let supportChain: Chain;
  switch (chain) {
    case "base":
      supportChain = base;
      break;
    case "optimism":
      supportChain = optimism;
      break;
    case "ethereum":
      supportChain = mainnet;
      break;
    case "arbitrumSepolia":
      supportChain = arbitrumSepolia;
      break;
    default:
      supportChain = sepolia;
      break;
  }

  return supportChain;
};

export class VerifyCommnad {
  readonly pkpTokenId: bigint;
  readonly txHash: `0x${string}`;
  readonly receiverAddress: `0x${string}`;
  readonly privateKey: `0x${string}`;

  constructor(
    pkpTokenId: string,
    txHash: `0x${string}`,
    receiverAddress: `0x${string}`,
    options: any,
  ) {
    this.pkpTokenId = BigInt(pkpTokenId);
    this.txHash = txHash;
    this.receiverAddress = receiverAddress;
    this.privateKey = options.privateKey;
  }

  signTxHash = () => {
    const signature = privateKeyToAccount(this.privateKey).signMessage({
      message: this.txHash,
    });

    return signature;
  };

  claim = async () => {
    const litNodeClient = new LitNodeClient({
      litNetwork: LitNetwork.DatilDev,
      debug: true,
    });
    await litNodeClient.connect();

    const pkpPublicKey = await getPKPPublicKey(this.pkpTokenId);
    const pkpCid = await getPKPCid(this.pkpTokenId);
    const signature = await this.signTxHash();
    console.log(`PKP PublicKey: ${pkpPublicKey}`);
    console.log(`PKP Tx: ${this.txHash}`);
    console.log(`PKP CID: ${pkpCid}`);
    console.log(`PKP Signature: ${signature}`);

    const account = privateKeyToAccount(this.privateKey);
    const sessionSignatures = await litNodeClient.getSessionSigs({
      chain: "ethereum",
      expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
      resourceAbilityRequests: [
        {
          resource: new LitActionResource("*"),
          ability: LitAbility.LitActionExecution,
        },
      ],
      authNeededCallback: async ({
        uri,
        expiration,
        resourceAbilityRequests,
      }) => {
        const toSign = await createSiweMessage({
          uri,
          expiration,
          resources: resourceAbilityRequests,
          walletAddress: account.address,
          nonce: await litNodeClient.getLatestBlockhash(),
          litNodeClient,
        });

        const signature = await account.signMessage({ message: toSign });
        return {
          sig: signature,
          derivedVia: "web3.eth.personal.sign",
          signedMessage: toSign,
          address: account.address,
          algo: "ed25519",
        };
      },
    });

    const litReturn = await litNodeClient.executeJs({
      ipfsId: pkpCid,
      sessionSigs: sessionSignatures,
      jsParams: {
        pkpPublicKey:
          "044ada0d2cf4d4c56afcd71736d4da1c0678378b3e5fb40c7495af5203285252fe2eb938c8e524f3027c30140a444ed3cc581d280b71eecb943c4b8615c6b6737e",
        payload:
          "0xd377db433def64e206aa655b39edbfad94c270c6c31ea9560c1d10493ebfe0e0",
        txHash: this.txHash,
        sigature: signature,
      },
    });

    console.log(litReturn);

    await litNodeClient.disconnect();
  };
}

export class CreateCommand {
  readonly source: string;
  readonly destain: string;
  readonly receiver: `0x${string}`;
  readonly privateKey: `0x${string}`;
  readonly value: string;
  readonly pinataJWT: string;

  constructor(
    source: string,
    destain: string,
    receiver: `0x${string}`,
    options: any,
  ) {
    this.source = source;
    this.destain = destain;
    this.receiver = receiver;

    this.value = options.value;
    this.privateKey = options.privateKey;
    this.pinataJWT = options.pinataJwt;
  }

  generateLitAction = (confirmNonce: string) => {
    const openDate = new Date().toISOString();
    const code = `(async () => {
const openDate = Date.parse("${openDate}"), receiveMinAmount = ethers.utils.parseEther("${this.value}"), rpcUrl = await LitActions.getRpcUrl({ chain: "${this.destain}" }), provider = new ethers.providers.JsonRpcProvider(rpcUrl);
if ((new Date()).getTime() - openDate > 432000000)
  if (ethers.utils.verifyMessage(nonce, sigature) === "${this.source}")
    LitActions.setResponse({
      response: "true"
    });
  else
    LitActions.setResponse({
      response: "Nonce Sigature Err"
    });
else {
  const txReceipt = await provider.getTransactionReceipt(txHash), tx = await provider.getTransaction(txHash);
  if (txReceipt.confirmations < 50) {
    LitActions.setResponse({
      response: "BlockNumber Close Err"
    });
    return;
  }
  if (txReceipt.to !== "${this.receiver}") {
    LitActions.setResponse({
      response: "Receiver Address Err"
    });
    return;
  }
  if (tx.value < receiveMinAmount) {
    LitActions.setResponse({
      response: "Receiver Amount Err"
    });
    return;
  }
  if (tx.data !== "${confirmNonce}")
    LitActions.setResponse({
      response: "Confirm Nonce Error"
    });
  if (ethers.utils.verifyMessage(txHash, sigature) === tx.from)
    LitActions.signEcdsa({
      publicKey: pkpPublicKey,
      toSign: ethers.utils.arrayify(payload),
      sigName: "tx",
    });
  else
    LitActions.setResponse({
      response: "TxHash Sign Err"
    });
}
})();`;

    return code;
  };

  pinFileToIPFS = async (actionName: string, code: Blob) => {
    const formData = new FormData();
    formData.append("file", code, actionName + ".js");
    formData.append(
      "pinataMetadata",
      JSON.stringify({
        name: "LitMagicAction",
      }),
    );
    formData.append(
      "pinataOptions",
      JSON.stringify({
        cidVersion: 0,
      }),
    );

    const req = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${this.pinataJWT}`,
      },
    });

    const res = await req.json();

    return res.IpfsHash as string;
  };

  uploadAndGetIPFSCid = async (actionName: string, code: string) => {
    const file = new Blob([code]);
    const ipfsCID = await this.pinFileToIPFS(actionName, file);

    return ipfsCID;
  };

  getBytesFromMultihash = (multihash: string) => {
    const decoded = bs58.decode(multihash);

    return `0x${Buffer.from(decoded).toString("hex")}` as `0x${string}`;
  };

  createPKP = async () => {
    const confirmNonce = "0x" + generateSiweNonce().slice(0, 6);

    const account = privateKeyToAccount(this.privateKey);
    const litWalletClient = createWalletClient({
      account,
      chain: datilDev,
      transport: http(),
    });

    const mintCost = await client.readContract({
      ...PKPNFTContract,
      functionName: "mintCost",
    });
    console.log(`Mint PKP Cost: ${formatEther(mintCost)}`);

    const code = this.generateLitAction(confirmNonce);

    const ipfsCID = await this.uploadAndGetIPFSCid(confirmNonce, code);
    const { request, result } = await client.simulateContract({
      ...PKPNFTContract,
      account,
      functionName: "mintGrantAndBurnNext",
      args: [2n, this.getBytesFromMultihash(ipfsCID)],
      value: mintCost,
    });

    const txHash = await litWalletClient.writeContract(request);
    console.log(`Mint PKP Tx: ${txHash}`);

    const receipt = await getTransactionReceipt(client, {
      hash: txHash,
    });

    const logs = parseEventLogs({
      abi: PubKeyRouterABI,
      logs: receipt.logs,
      eventName: "PubkeyRoutingDataSet",
    });

    const pkpEthereumAddress = publicKeyToAddress(logs[0].args.pubkey);
    console.log(`PKP Token Id: ${logs[0].args.tokenId}`);
    console.log(`PKP Ethereum Address: ${pkpEthereumAddress}`);
    console.log(`Confirm Nonce: ${confirmNonce}`);

    const walletClient = createWalletClient({
      account,
      chain: getSourceChain(this.source as SupportChain),
      transport: http(),
    });

    const depositTx = await walletClient.sendTransaction({
      account,
      to: pkpEthereumAddress,
      value: parseEther(this.value),
    });

    console.log(`PKP Deposit Tx: ${depositTx}`);
  };
}
