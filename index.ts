import { Command, Option, Argument } from "commander";
import { checksumAddress } from "viem";

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
    ]),
  )
  .addArgument(
    new Argument("<destin>", "destination chain").choices([
      "base",
      "ethereum",
      "optimism",
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
    new Option("-d, --database <FILE_PATH>", "DataBase File Path").default(
      "db.sqilt",
    ),
  )
  .action(async (source, destain, receiver, options) => {});

program.parse();
