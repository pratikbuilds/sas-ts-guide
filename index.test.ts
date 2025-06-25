import {
  getCreateCredentialInstruction,
  getCreateSchemaInstruction,
  SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS,
  deriveSchemaPda,
  serializeAttestationData,
  getCreateAttestationInstruction,
  getCreateTokenizedAttestationInstruction,
  deriveAttestationPda,
  deriveAttestationMintPda,
  deriveSasAuthorityAddress,
  deriveSchemaMintPda,
  CREDENTIAL_SEED,
  fetchSchema,
  deriveCredentialPda,
  SCHEMA_SEED,
  ATTESTATION_SEED,
  ATTESTATION_MINT_SEED,
  SCHEMA_MINT_SEED,
  SAS_SEED,
} from "sas-lib";
import { loadKeypairSignerFromFile } from "gill/node";
import type { IInstruction } from "gill";
import {
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  findAssociatedTokenPda,
  TOKEN_2022_PROGRAM_ADDRESS,
  getMintSize,
} from "gill/programs/token";
import { SYSTEM_PROGRAM_ADDRESS } from "gill/programs";
import {
  createTransaction,
  createSolanaClient,
  signTransactionMessageWithSigners,
  getSignatureFromTransaction,
  getExplorerLink,
  getProgramDerivedAddress,
  type KeyPairSigner,
} from "gill";
import { address } from "gill";
import { PublicKey } from "@solana/web3.js";
import { test } from "bun:test";

const name = "test28";

async function getPayer() {
  return await loadKeypairSignerFromFile(
    "/Users/pratik/.config/solana/id.json"
  );
}

async function getAttestationPda(
  credentialPublicKey: PublicKey,
  schemaPublicKey: PublicKey,
  noncePublicKey: PublicKey
) {
  const [attestationPda, attestationBump] = await getProgramDerivedAddress({
    programAddress: SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS,
    seeds: [
      ATTESTATION_SEED,
      credentialPublicKey.toBuffer(),
      schemaPublicKey.toBuffer(),
      noncePublicKey.toBuffer(),
    ],
  });
  return attestationPda;
}

async function getCredentialPda(authority: PublicKey, name: string) {
  const [credentialPda, credentialBump] = await getProgramDerivedAddress({
    programAddress: SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS,
    seeds: [CREDENTIAL_SEED, authority.toBuffer(), name],
  });
  return credentialPda;
}

async function getSchemaPda(
  credentialPublicKey: PublicKey,
  name: string,
  version: number
) {
  const [schemaPda, schemaBump] = await getProgramDerivedAddress({
    programAddress: SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS,
    seeds: [
      SCHEMA_SEED,
      credentialPublicKey.toBuffer(),
      Buffer.from(name),
      Buffer.from([version]),
    ],
  });

  return schemaPda;
}

async function getSasAuthorityPda() {
  const [sasAuthorityPda, sasAuthorityBump] = await getProgramDerivedAddress({
    programAddress: SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS,
    seeds: [SAS_SEED],
  });

  return sasAuthorityPda;
}

async function sendAndLogTransaction({
  payer,
  instructions,
}: {
  payer: KeyPairSigner;
  instructions: IInstruction[];
}) {
  const { rpc, sendAndConfirmTransaction } = createSolanaClient({
    urlOrMoniker: "devnet",
  });
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const transaction = createTransaction({
    version: "legacy",
    feePayer: payer,
    instructions,
    latestBlockhash,
  });
  const signedTransaction = await signTransactionMessageWithSigners(
    transaction
  );
  const signature = getSignatureFromTransaction(signedTransaction);

  try {
    await sendAndConfirmTransaction(signedTransaction, {
      skipPreflight: true,
      commitment: "confirmed",
    });
    console.log("Transaction confirmed!");
    console.log(
      "Explorer link:",
      getExplorerLink({ transaction: signature, cluster: "devnet" })
    );
  } catch (err) {
    console.error("Unable to send and confirm the transaction");
    console.error(err);
  }
}

test("create credential", async () => {
  const payer = await getPayer();
  const addresses = [
    address("ELxUQkWLMBCoMatry9qzQR6RHiUYmVndUpmPwhZ8PKJK"),
    address("Du3X3wKN3LHfSbXtX2PW5jhnSHit8j8NSb19VZW6V9mu"),
  ];

  const authorityAddress = new PublicKey(payer.address);

  // Derive PDA
  const credentialPda = await getCredentialPda(authorityAddress, name);

  console.log("credentialPda", credentialPda);

  const instruction = getCreateCredentialInstruction({
    authority: payer,
    payer: payer,
    name: name,
    systemProgram: SYSTEM_PROGRAM_ADDRESS,
    signers: addresses,
    credential: credentialPda,
  });

  await sendAndLogTransaction({ payer, instructions: [instruction] });
});

test("create schema", async () => {
  const payer = await getPayer();

  const authorityAddress = new PublicKey(payer.address);
  const credentialPda = await getCredentialPda(authorityAddress, name);

  const credentialPublicKey = new PublicKey(credentialPda);

  const schemaPda = await getSchemaPda(credentialPublicKey, name, 1);

  const layout = Buffer.from([12, 12, 12]);

  const instruction = getCreateSchemaInstruction({
    authority: payer,
    payer: payer,
    name: name,
    systemProgram: SYSTEM_PROGRAM_ADDRESS,
    credential: credentialPda,
    description: "test desc",
    fieldNames: ["name", "age", "country"],
    schema: schemaPda,
    layout: layout,
  });

  await sendAndLogTransaction({ payer, instructions: [instruction] });
});

test("create attestation", async () => {
  const payer = await getPayer();

  const authorityAddress = new PublicKey(payer.address);

  const credentialPda = await getCredentialPda(authorityAddress, name);

  const credentialPublicKey = new PublicKey(credentialPda);

  const schemaPda = await getSchemaPda(credentialPublicKey, name, 1);

  const nonce = address(payer.address);
  const noncePublicKey = new PublicKey(nonce);

  const schemaPublicKey = new PublicKey(schemaPda);
  const attestationPda = await getAttestationPda(
    credentialPublicKey,
    schemaPublicKey,
    noncePublicKey
  );
  const { rpc } = createSolanaClient({
    urlOrMoniker: "devnet",
  });
  const schema = await fetchSchema(rpc, schemaPda);
  // console.log("schema", schema);
  const data = serializeAttestationData(schema.data, {
    name: "john",
    age: "11",
    country: "spain",
  });

  const instruction = getCreateAttestationInstruction({
    systemProgram: SYSTEM_PROGRAM_ADDRESS,
    authority: payer,
    payer: payer,
    credential: credentialPda,
    schema: schemaPda,
    attestation: attestationPda,
    nonce: nonce,
    data: data,
    expiry: 0,
  });

  await sendAndLogTransaction({ payer, instructions: [instruction] });
});

test("create tokenized attestation", async () => {
  const payer = await getPayer();

  const authorityAddress = new PublicKey(payer.address);

  const credentialPda = await getCredentialPda(authorityAddress, name);

  const credentialPublicKey = new PublicKey(credentialPda);

  const schemaPda = await getSchemaPda(credentialPublicKey, name, 1);

  const nonce = address("Dk5hHsjnaD7GZHGpgU8dunbaBVi7vW5mo4QQpjVWWt94");
  const noncePublicKey = new PublicKey(nonce);

  const schemaPublicKey = new PublicKey(schemaPda);

  const attestationPda = await getAttestationPda(
    credentialPublicKey,
    schemaPublicKey,
    noncePublicKey
  );

  const attestationPublicKey = new PublicKey(attestationPda);
  const [attestationMintPda, attestationMintBump] =
    await getProgramDerivedAddress({
      programAddress: SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS,
      seeds: [ATTESTATION_MINT_SEED, attestationPublicKey.toBuffer()],
    });

  const [schemaMintPda, schemaMintBump] = await getProgramDerivedAddress({
    programAddress: SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS,
    seeds: [SCHEMA_MINT_SEED, schemaPublicKey.toBuffer()],
  });

  const sasAuthorityPda = await getSasAuthorityPda();

  console.log("sasAuthorityPda", sasAuthorityPda);

  const [recipientTokenAccount] = await findAssociatedTokenPda({
    mint: attestationMintPda,
    owner: payer.address,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  });

  const mintAccountSpace = getMintSize([
    {
      __kind: "GroupMemberPointer",
      authority: address(sasAuthorityPda),
      memberAddress: attestationMintPda,
    },
    { __kind: "NonTransferable" },
    {
      __kind: "MetadataPointer",
      authority: address(sasAuthorityPda),
      metadataAddress: attestationMintPda,
    },
    { __kind: "PermanentDelegate", delegate: address(sasAuthorityPda) },
    { __kind: "MintCloseAuthority", closeAuthority: address(sasAuthorityPda) },
    {
      __kind: "TokenMetadata",
      updateAuthority: address(sasAuthorityPda),
      mint: attestationMintPda,
      name: "test",
      symbol: "PAT",
      uri: "https://lens.google.com/uploadbyurl?url=https://gmgn.ai/external-res/14bc705087305aaeda646c3546c5cce3.webp",
      additionalMetadata: new Map(),
    },
    {
      __kind: "TokenGroupMember",
      group: schemaMintPda,
      mint: attestationMintPda,
      memberNumber: 1,
    },
  ]);

  console.log("mintAccountSpace", mintAccountSpace);

  const { rpc } = createSolanaClient({
    urlOrMoniker: "devnet",
  });
  const schema = await fetchSchema(rpc, schemaPda);
  console.log("schema", schema);
  const data = serializeAttestationData(schema.data, {
    name: "charlie",
    age: "22",
    country: "japan",
  });

  const instruction = getCreateTokenizedAttestationInstruction({
    systemProgram: SYSTEM_PROGRAM_ADDRESS,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
    authority: payer,
    attestation: attestationPda,
    credential: credentialPda,
    schema: schemaPda,
    recipient: payer.address,
    nonce: payer.address,
    payer: payer,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
    symbol: "PAT",
    name: "tName",
    uri: "https://lens.google.com/uploadbyurl?url=https://gmgn.ai/external-res/14bc705087305aaeda646c3546c5cce3.webp",
    attestationMint: attestationMintPda,
    schemaMint: schemaMintPda,
    sasPda: address(sasAuthorityPda),
    mintAccountSpace: mintAccountSpace,
    recipientTokenAccount: recipientTokenAccount,
    data: data,
    expiry: 0,
  });

  await sendAndLogTransaction({ payer, instructions: [instruction] });
});
