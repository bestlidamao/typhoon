import { Command, Option, Argument } from "commander";
import { checksumAddress } from "viem";
import {
  CreateCommand,
  TEECreateCommand,
  TEEVerifyCommand,
  VerifyCommnad,
} from "./commands/tools";

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
  .command("tcreate")
  .description("Crate TEE bridge transcation")
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
    new Option("--endpoint <string>", "TEE Birdge Endpoint").default(
      "http://localhost:3000",
    ),
  )
  .action(async (source, destain, receiver, options) => {
    const command = new TEECreateCommand(source, destain, receiver, options);
    await command.createOrder();
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
    new Option("--chain <name>", "Claim Chain").makeOptionMandatory(true),
  )
  .addOption(
    new Option(
      "-p, --private-key <RAW_PRIVATE_KEY>",
      "Use the provided private key.",
    ).env("VERIFY_PRIVATE_KEY"),
  )
  .option("--debug", "Display Lit Protocol Debug Logs")
  .action(async (tokenId, txHash, receiver, options) => {
    const debugFlag = options.debug ? true : false;
    const command = new VerifyCommnad(
      tokenId,
      txHash,
      receiver,
      debugFlag,
      options,
    );
    await command.claim();
  });

program
  .command("tclaim")
  .description("Verify and claim TEE Order")
  .argument("<Order Nonce>", "order id")
  .argument("<hex>", "transcation tx")
  .argument("<receiver>", "Receiver Address", (value) => {
    return checksumAddress(value as `0x${string}`);
  })
  .addOption(
    new Option("--chain <name>", "Claim Chain").makeOptionMandatory(true),
  )
  .addOption(
    new Option(
      "-p, --private-key <RAW_PRIVATE_KEY>",
      "Use the provided private key.",
    ).env("VERIFY_PRIVATE_KEY"),
  )
  .addOption(
    new Option("--endpoint <string>", "TEE Birdge Endpoint").default(
      "http://localhost:3000",
    ),
  )
  .action(async (nonce, txHash, receiver, options) => {
    const command = new TEEVerifyCommand(nonce, txHash, receiver, options);
    await command.claim();
  });

program.parse();
