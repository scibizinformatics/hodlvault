Interface NetworkProvider
Network
getUtxos()
getBlockHeight()
getRawTransaction()
sendRawTransaction()
Custom NetworkProviders
Provider-Specific functionality
Limitations

Network Provider
The CashScript SDK needs to connect to the BCH network to perform certain operations, like retrieving the contract's balance, or sending transactions. The recommended network provider to use blockchain network functionality is the ElectrumNetworkProvider, however for local development it is recommended to use a MockNetworkProvider.

tip
CashScript NetworkProviders have a standardized interface, this allows different network providers to be used by the SDK and makes it easy to swap out dependencies.

Interface NetworkProvider
Network
type Network = 'mainnet' | 'chipnet' | 'mocknet' | 'testnet3' | 'testnet4' | 'regtest';

The network parameter can be one of 6 different options.

Example
const connectedNetwork = provider.network;

getUtxos()
async provider.getUtxos(address: string): Promise<Utxo[]>;

Returns all UTXOs on specific address. Both confirmed and unconfirmed UTXOs are included.

interface Utxo {
txid: string;
vout: number;
satoshis: bigint;
token?: TokenDetails;
}

interface TokenDetails {
amount: bigint;
category: string;
nft?: {
capability: 'none' | 'mutable' | 'minting';
commitment: string;
};
}

Example
const userUtxos = await provider.getUtxos(userAddress)

getBlockHeight()
async provider.getBlockHeight(): Promise<number>;

Get the current blockHeight.

Example
const currentBlockHeight = await provider.getBlockHeight()

getRawTransaction()
async provider.getRawTransaction(txid: string): Promise<string>;

Retrieve the Hex transaction details for a given transaction ID.

Example
const rawTransaction = await provider.getRawTransaction(txid)

sendRawTransaction()
async provider.sendRawTransaction(txHex: string): Promise<string>;

Broadcast a raw hex transaction to the network.

Example
const txId = await provider.sendRawTransaction(txHex)

Custom NetworkProviders
A big strength of the NetworkProvider setup is that it allows you to implement custom providers. So if you want to use a new or different BCH indexer for network information, it is simple to add support for it by creating your own NetworkProvider adapter by implementing the NetworkProvider interface.

You can create a PR to add your custom NetworkProvider to the CashScript codebase to share this functionality with others. It is required to have basic automated tests for any new NetworkProvider.

Provider-Specific functionality
Beyond the standardized NetworkProvider interface each provider can have its own provider-specific functionality. This can either be done by extending the NetworkProvider interface or by providing a more full-featured networking client to create the NetworkProvider.

Limitations
If you look at the Transaction Lifecycle guide then you'll see there are blockchain edge cases like chain re-organisations or double spends. Ideally the NetworkProvider interface would be able to provide more detailed Utxo chain information like whether the UTXO is unconfirmed or confirmed, the number of confirmations and the block-hash of the block which included the transaction creating the UTXO.

Currently however the NetworkProvider interface does not include the details needed to understand whether blockchain state is confirmed, pending or ended up getting reversed. This means that in the case something does end up being reversed your application might not correctly be in sync with the actual network state.
