import { Command, Option, Argument } from "commander";
import { checksumAddress } from "viem";
import { CreateCommand, VerifyCommnad } from "./commands/tools";

const program = new Command();

program
  .name("lit-bridge")
  .description("CLI to bridge ETH by Lit Protocol")
  .version("0.0.1");

program
  .command("create")
  .description("Crate bridge transcation")
  .addArgument(
    new Argument("<source>", "source chain").choices([
      "base",
      "ethereum",
      "optimism",
      "sepolia",
      "arbitrumSepolia",
    ]),
  )
  .addArgument(
    new Argument("<destin>", "destination chain").choices([
      "base",
      "ethereum",
      "optimism",
      "sepolia",
      "arbitrumSepolia",
    ]),
  )
  .addArgument(
    new Argument("<address>", "destination receiver address")
      .argRequired()
      .argParser((value) => {
        return checksumAddress(value as `0x${string}`);
      }),
  )
  .addOption(
    new Option(
      "--value <number>",
      "Ether to send in the transaction.",
    ).makeOptionMandatory(true),
  )
  .addOption(
    new Option(
      "-p, --private-key <RAW_PRIVATE_KEY>",
      "Use the provided private key.",
    ).env("PRIVATE_KEY"),
  )
  .addOption(
    new Option("--pinata-jwt <JWT_TOKEN>", "Pinata Cloud JWT Token").env("JWT"),
  )
  .action(async (source, destain, receiver, options) => {
    const command = new CreateCommand(source, destain, receiver, options);
    await command.createPKP();
  });

program
  .command("claim")
  .description("Verify and claim")
  .argument("<PKP Token Id>", "order id")
  .argument("<hex>", "transcation tx")
  .argument("<receiver>", "Receiver Address", (value) => {
    return checksumAddress(value as `0x${string}`);
  })
  .addOption(
    new Option(
      "-p, --private-key <RAW_PRIVATE_KEY>",
      "Use the provided private key.",
    ).env("VERIFY_PRIVATE_KEY"),
  )
  .action(async (tokenId, txHash, receiver, options) => {
    const command = new VerifyCommnad(tokenId, txHash, receiver, options);
    await command.claim();
  });

program.parse();
