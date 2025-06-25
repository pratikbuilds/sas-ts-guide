# Solana Attestation Service: SDK Guide

This guide provides a basic implementation guide, technical breakdown of creating credential, schema, attestation and tokenized attestation instruction in the Solana Attestation Service SDK. It explains the purpose of each function and the parameters required to build a transaction.

For full, practical implementation examples, please refer to the `index.test.ts` file in this repository.

---

## 1. `getCreateCredentialInstruction`

**Purpose:** Establishes a new on-chain credential account, which acts as a root identity or namespace for issuing schemas and attestations.

**Key Concepts:** A credential is the foundation of your attestation system. It's owned by an `authority` and can have multiple `signers` who are authorized to attest.

| Parameter       | Type                | Description                                       |
| --------------- | ------------------- | ------------------------------------------------- |
| `authority`     | `TransactionSigner` | The owner and controller of the credential.       |
| `payer`         | `TransactionSigner` | The account paying for the transaction and rent.  |
| `credential`    | `Address`           | The PDA for the new credential account.           |
| `name`          | `string`            | A unique name for the credential, used as a seed. |
| `signers`       | `Address[]`         | Additional public keys authorized to attest.      |
| `systemProgram` | `Address`           | The Solana System Program address.                |

---

## 2. `getCreateSchemaInstruction`

**Purpose:** Defines a data structure (a "schema") under an existing credential. This specifies the layout, field names, and data types that future attestations must follow.

**Key Concepts:** Schemas enforce a consistent and predictable data format. The `layout` parameter uses a specific enum to define data types (e.g., `12` for a string). The combination of a credential, schema name, and version must be unique.

| Parameter       | Type                | Description                                                                           |
| --------------- | ------------------- | ------------------------------------------------------------------------------------- |
| `authority`     | `TransactionSigner` | The signer creating the schema. Must be the credential owner or an authorized signer. |
| `payer`         | `TransactionSigner` | The account paying for the transaction.                                               |
| `credential`    | `Address`           | The parent credential's PDA.                                                          |
| `schema`        | `Address`           | The PDA for the new schema account.                                                   |
| `name`          | `string`            | A name for the schema, used as a seed.                                                |
| `description`   | `string`            | A human-readable description of the schema.                                           |
| `fieldNames`    | `string[]`          | An array of names for each field defined in the `layout`.                             |
| `layout`        | `Buffer`            | A buffer representing the data types for each field.                                  |
| `systemProgram` | `Address`           | The Solana System Program address.                                                    |

---

## 3. `getCreateAttestationInstruction`

**Purpose:** Creates an immutable, on-chain record of data ("attestation") that conforms to a pre-defined schema.

**Key Concepts:** An attestation is a signed "claim" made by an authority. The `nonce` is a unique value (such as a public key or a counter) that ensures each attestation PDA is unique, even if the creator and schema are identical.

| Parameter       | Type                | Description                                                              |
| --------------- | ------------------- | ------------------------------------------------------------------------ |
| `authority`     | `TransactionSigner` | The signer creating the attestation.                                     |
| `payer`         | `TransactionSigner` | The account paying for the transaction.                                  |
| `credential`    | `Address`           | The parent credential's PDA.                                             |
| `schema`        | `Address`           | The schema's PDA that this attestation conforms to.                      |
| `attestation`   | `Address`           | The PDA for the new attestation account.                                 |
| `nonce`         | `Address`           | Unique pubkey seed; can be random or user-derived.                       |
| `data`          | `Buffer`            | The serialized data for the attestation, matching the schema's `layout`. |
| `expiry`        | `number`            | A Unix timestamp for expiration. Use `0` for no expiry.                  |
| `systemProgram` | `Address`           | The Solana System Program address.                                       |

---

## 4. `getCreateTokenizedAttestationInstruction`

**Purpose:** Creates an attestation that is also minted as an SPL Token (using the Token-2022 standard) on-chain.

**Key Concepts:** This instruction merges the logic of creating an attestation with minting a token. The `mintAccountSpace` is crucial for allocating the correct amount of on-chain space for the token mint account, including all its required extensions.

| Parameter               | Type                | Description                                                                         |
| ----------------------- | ------------------- | ----------------------------------------------------------------------------------- |
| `authority`             | `TransactionSigner` | The creator of the attestation and the associated token.                            |
| `payer`                 | `TransactionSigner` | The account paying for all transaction fees and rents.                              |
| `attestation`           | `Address`           | The PDA for the attestation data account.                                           |
| `attestationMint`       | `Address`           | The PDA for the token mint.                                                         |
| `recipient`             | `Address`           | The public key of the wallet that will receive the token.                           |
| `recipientTokenAccount` | `Address`           | The recipient's Associated Token Account (ATA).                                     |
| `sasPda`                | `Address`           | The PDA which has authority over the token.                                         |
| `data`                  | `Buffer`            | The serialized attestation data.                                                    |
| `mintAccountSpace`      | `number`            | The calculated size in bytes for the mint account with extensions.                  |
| `tokenProgram`          | `Address`           | The SPL Token-2022 Program address.                                                 |
| _Various_               | _Address, string_   | Includes other required PDAs and metadata (`credential`, `schema`, `symbol`, etc.). |

---

## References

- **Official Documentation:** For more detailed concepts and API references, visit the [Solana Attestation Service Docs](https://attest.solana.com/docs).
- **Source Code:** To explore the on-chain program and the SDK's implementation, view the [main codebase on GitHub](https://github.com/solana-foundation/solana-attestation-service).
