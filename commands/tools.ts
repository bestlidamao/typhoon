import { createWalletClient, formatEther, http, parseEventLogs } from "viem";
import { privateKeyToAccount, publicKeyToAddress } from "viem/accounts";
import { generateSiweNonce } from "viem/siwe";
import { client, datilDev } from "../config";
import { PKPNFTContract } from "../abi/PKPNFT";
import bs58 from "bs58";
import { getTransactionReceipt } from "viem/actions";
import { PubKeyRouterABI } from "../abi/PubKeyRouter";

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
const openDate = Date.parse("${openDate}"), receiveMinAmount = ethers.utils.parseEther("${this.value}"), rpcUrl = await LitActions.getRpcUrl({ chain: "${destain}" }), provider = new ethers.providers.JsonRpcProvider(rpcUrl);
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
  if (txReceipt.confirmations < 500) {
    LitActions.setResponse({
      response: "BlockNumber Close Err"
    });
    return;
  }
  if (txReceipt.to !== "${this.destain}") {
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
    // const sourceWalletClient = createSourceWalletClient(soureChain, account);

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

    console.log(`PKP Token Id: ${logs[0].args.tokenId}`);
    console.log(
      `PKP Ethereum Address: ${publicKeyToAddress(logs[0].args.pubkey)}`,
    );
  };
}
