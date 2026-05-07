import {
  Wormhole,
  TokenId,
  isTokenId,
  ChainContext,
  Network,
  Signer,
  Chain,
  ChainAddress,
} from "@wormhole-foundation/sdk";

import evm from "@wormhole-foundation/sdk/evm";
import solana from "@wormhole-foundation/sdk/solana";

export async function getSigner<N extends Network, C extends Chain>(
  chain: ChainContext<N, C>
): Promise<{
  chain: ChainContext<N, C>;
  signer: Signer<N, C>;
  address: ChainAddress<C>;
}> {
  let signer: Signer;

  const platform = chain.platform.utils()._platform;

  switch (platform) {
    case "Evm":
      signer = await (await evm()).getSigner(
        await chain.getRpc(),
        process.env.ETH_PRIVATE_KEY!
      );
      break;

    case "Solana":
      signer = await (await solana()).getSigner(
        await chain.getRpc(),
        process.env.SOL_PRIVATE_KEY!
      );
      break;

    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  return {
    chain,
    signer: signer as Signer<N, C>,
    address: Wormhole.chainAddress(chain.chain, signer.address()),
  };
}

export async function getTokenDecimals<N extends Network>(
  wh: Wormhole<N>,
  token: TokenId,
  chain: ChainContext<N, any>
): Promise<number> {
  return isTokenId(token)
    ? Number(await wh.getDecimals(token.chain, token.address))
    : chain.config.nativeTokenDecimals;
}