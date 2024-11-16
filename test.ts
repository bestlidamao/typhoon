import { TransactionEnvelopeEip1559, Secp256k1, Value } from "ox";
import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet, sepolia } from "viem/chains";

const account = privateKeyToAccount(
  "0x25aae0c42a65b6ae735b5a43046e783ab7c121550b4c772631148669cba68ab3",
);

// Construct the Envelope.
export const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(),
});

const request = await walletClient.prepareTransactionRequest({
  account,
  to: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
  value: parseEther("0.0001"),
});

const envelope = TransactionEnvelopeEip1559.from({
  chainId: request.chainId,
  maxFeePerGas: request.maxFeePerGas,
  maxPriorityFeePerGas: request.maxPriorityFeePerGas,
  nonce: BigInt(request.nonce),
  to: request.to,
  value: request.value,
});

console.log(TransactionEnvelopeEip1559.getSignPayload(envelope));
// Sign over the Envelope.
// const signature = Secp256k1.sign({
//   payload: TransactionEnvelopeEip1559.getSignPayload(envelope),
//   privateKey:
//     "0xa475a8aba1a83929f4825148c187e5ec29d797b406633cda77a63ac9d85e9974",
// });

// // Attach the Signature to the Envelope.
// const signed = TransactionEnvelopeEip1559.from(envelope, { signature });
