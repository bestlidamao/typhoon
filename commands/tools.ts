import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  parseEther,
  parseEventLogs,
  parseGwei,
  toBytes,
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
import { PKPPremissionsContract } from "../abi/PKPPermissions";
import { TransactionEnvelopeEip1559 } from "ox";
import { fromHex } from "ox/BlsPoint";
import type { AppType } from "../backend/tee";
import { hc } from "hono/client";

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
  readonly chain: Chain;
  readonly debugFlag: boolean;

  constructor(
    pkpTokenId: string,
    txHash: `0x${string}`,
    receiverAddress: `0x${string}`,
    debugFlag: boolean,
    options: any,
  ) {
    this.pkpTokenId = BigInt(pkpTokenId);
    this.txHash = txHash;
    this.receiverAddress = receiverAddress;
    this.privateKey = options.privateKey;
    this.debugFlag = debugFlag;
    this.chain = getSourceChain(options.chain);
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
      debug: this.debugFlag,
    });
    await litNodeClient.connect();

    const pkpPublicKey = await getPKPPublicKey(this.pkpTokenId);
    const pkpCid = await getPKPCid(this.pkpTokenId);
    const signature = await this.signTxHash();
    // console.log(`PKP PublicKey: ${pkpPublicKey}`);
    // console.log(`PKP Tx: ${this.txHash}`);
    // console.log(`PKP CID: ${pkpCid}`);
    // console.log(`PKP Signature: ${signature}`);

    const sessionSigs = await litNodeClient.getLitActionSessionSigs({
      pkpPublicKey: pkpPublicKey,
      chain: "ethereum",
      expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
      resourceAbilityRequests: [
        {
          resource: new LitPKPResource("*"),
          ability: LitAbility.PKPSigning,
        },
        {
          resource: new LitActionResource("*"),
          ability: LitAbility.LitActionExecution,
        },
      ],
      litActionIpfsId: pkpCid,
      jsParams: {
        txHash: this.txHash,
        sigature: signature,
      },
    });

    const account = privateKeyToAccount(this.privateKey);

    const client = createPublicClient({
      chain: this.chain,
      transport: http(),
    });

    const walletClient = createWalletClient({
      chain: this.chain,
      transport: http(),
    });

    const pkpBalance = await client.getBalance({
      address: publicKeyToAddress(pkpPublicKey),
    });

    const request = await walletClient.prepareTransactionRequest({
      account: publicKeyToAddress(pkpPublicKey),
      to: this.receiverAddress,
      value: pkpBalance,
    });
    console.log(publicKeyToAddress(pkpPublicKey));
    const envelope = TransactionEnvelopeEip1559.from({
      chainId: this.chain.id,
      maxFeePerGas: request.maxFeePerGas,
      maxPriorityFeePerGas: request.maxPriorityFeePerGas,
      gas: request.gas,
      nonce: BigInt(request.nonce),
      to: request.to,
      value: request.value,
    });

    const signingResult = await litNodeClient.pkpSign({
      pubKey: pkpPublicKey,
      sessionSigs,
      toSign: toBytes(TransactionEnvelopeEip1559.getSignPayload(envelope)),
    });

    const serializedTransaction = TransactionEnvelopeEip1559.serialize(
      envelope,
      {
        signature: {
          r: BigInt("0x" + signingResult.r),
          s: BigInt("0x" + signingResult.s),
          yParity: signingResult.recid,
        },
      },
    );

    const hash = await walletClient.sendRawTransaction({
      serializedTransaction,
    });

    console.log(`Claim Tx Hash: ${hash}`);
    await litNodeClient.disconnect();
  };
}

export class TEECreateCommnad {
  readonly source: string;
  readonly destain: string;
  readonly receiver: `0x${string}`;
  readonly privateKey: `0x${string}`;
  readonly value: number;
  readonly endpoint: string;

  constructor(
    source: string,
    destain: string,
    receiver: `0x${string}`,
    options: any,
  ) {
    this.source = source;
    this.destain = destain;
    this.receiver = receiver;

    this.value = parseFloat(options.value);
    this.privateKey = options.privateKey;
    this.endpoint = options.endpoint;
  }

  createOrder = async () => {
    const nonce = "0x" + generateSiweNonce().slice(0, 6);

    const client = hc<AppType>(this.endpoint);

    const res = await client.create.$post({
      json: {
        nonce,
        source: this.source,
        destin: this.destain,
        destinAddress: this.destain,
        value: this.value,
      },
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`Order Account: ${data.account}`);
    }
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
    LitActions.setResponse({
      response: "true"
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
    const { request: requestMint, result } = await client.simulateContract({
      ...PKPNFTContract,
      account,
      functionName: "mintNext",
      args: [2n],
      // args: [2n, this.getBytesFromMultihash(ipfsCID)],
      value: mintCost,
    });

    const mintTxHash = await litWalletClient.writeContract(requestMint);
    console.log(`Mint PKP Tx: ${mintTxHash}`);

    const receipt = await getTransactionReceipt(client, {
      hash: mintTxHash,
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

    const { request: requestLitAction } = await client.simulateContract({
      account: account,
      ...PKPPremissionsContract,
      functionName: "addPermittedAction",
      args: [logs[0].args.tokenId, this.getBytesFromMultihash(ipfsCID), [1n]],
    });

    const litActionTxHash =
      await litWalletClient.writeContract(requestLitAction);
    console.log(`PKP Add LitAction: ${litActionTxHash}`);

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
