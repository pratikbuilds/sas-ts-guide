# Solana Attestation Service: A Technical Guide to Instructions

This guide provides a basic implementation guide, technical breakdown of creating credential, schema, attestation and tokenized attestation instruction in the Solana Attestation Service SDK. It explains the purpose of each function and the parameters required to build a transaction.

For full, practical implementation examples, please refer to the `index.test.ts` file in this repository.

---

## 1. `getCreateCredentialInstruction`

**Purpose:** Establishes a new on-chain credential, which acts as a root identity or namespace for issuing schemas and attestations.

**Key Concepts:** A credential is the foundation of your attestation system. It's owned by an `authority` and can have multiple `signers` who are also authorized to manage it (e.g., create schemas).

| Parameter       | Type                | Description                                                                                                                                                            |
| --------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `authority`     | `TransactionSigner` | The main owner and controller of the credential.                                                                                                                       |
| `payer`         | `TransactionSigner` | The account that pays for transaction fees and the rent for the new credential account. Often the same as `authority`.                                                 |
| `credential`    | `Address`           | The Program Derived Address (PDA) for the new credential account. It must be derived using the credential seed, the authority's public key, and the credential's name. |
| `name`          | `string`            | A unique name for the credential under the given authority. This is used as a seed when deriving the `credential` PDA.                                                 |
| `signers`       | `Address[]`         | An array of additional public keys that are authorized to manage this credential.                                                                                      |
| `systemProgram` | `Address`           | The address of the Solana System Program, required for creating the new on-chain account.                                                                              |

---

## 2. `getCreateSchemaInstruction`

**Purpose:** Defines a data structure (a "schema") under an existing credential. This specifies the layout, field names, and data types that future attestations must follow.

**Key Concepts:** Schemas enforce a consistent and predictable data format. The `layout` parameter uses a specific enum to define data types (e.g., `12` for a string). The combination of a credential, schema name, and version must be unique.

| Parameter       | Type                | Description                                                                                                  |
| --------------- | ------------------- | ------------------------------------------------------------------------------------------------------------ |
| `authority`     | `TransactionSigner` | The signer creating the schema. Must be the credential `authority` or one of its authorized `signers`.       |
| `payer`         | `TransactionSigner` | The account that pays for the transaction and schema account rent.                                           |
| `credential`    | `Address`           | The PDA of the parent credential under which this schema is being created.                                   |
| `schema`        | `Address`           | The PDA for the new schema account, derived from the credential PDA, schema name, and version number.        |
| `name`          | `string`            | A name for the schema, used as a seed in deriving the `schema` PDA.                                          |
| `description`   | `string`            | A human-readable description of the schema's purpose.                                                        |
| `fieldNames`    | `string[]`          | An array of names corresponding to each field defined in the `layout`, in the same order.                    |
| `layout`        | `Buffer`            | A buffer representing the data types of each field. Each byte corresponds to a `SchemaDataTypes` enum value. |
| `systemProgram` | `Address`           | The address of the Solana System Program.                                                                    |

---

## 3. `getCreateAttestationInstruction`

**Purpose:** Creates an immutable, on-chain record of data ("attestation") that conforms to a pre-defined schema.

**Key Concepts:** An attestation is a signed "claim" made by an authority. The `nonce` is a unique value (such as a public key or a counter) that ensures each attestation PDA is unique, even if the creator and schema are identical.

| Parameter       | Type                | Description                                                                                              |
| --------------- | ------------------- | -------------------------------------------------------------------------------------------------------- |
| `authority`     | `TransactionSigner` | The signer creating the attestation.                                                                     |
| `payer`         | `TransactionSigner` | The account that pays for the transaction.                                                               |
| `credential`    | `Address`           | The PDA of the parent credential.                                                                        |
| `schema`        | `Address`           | The PDA of the schema that this attestation's data conforms to.                                          |
| `attestation`   | `Address`           | The PDA for the new attestation account, derived from the credential, schema, and `nonce`.               |
| `nonce`         | `Address`           | A unique public key used as a seed to derive a unique attestation PDA.                                   |
| `data`          | `Buffer`            | The serialized data for the attestation. The format **must** exactly match the schema's `layout`.        |
| `expiry`        | `number`            | A Unix timestamp indicating when the attestation expires. Use `0` for an attestation that never expires. |
| `systemProgram` | `Address`           | The address of the Solana System Program.                                                                |

---

## 4. `getCreateTokenizedAttestationInstruction`

**Purpose:** Creates an attestation that is also minted as an SPL Token (using the Token-2022 standard) on-chain.

**Key Concepts:** This instruction merges the logic of creating an attestation with minting a token. The `mintAccountSpace` is crucial for allocating the correct amount of on-chain space for the token mint account, including all its required extensions.

| Parameter               | Type                | Description                                                                                              |
| ----------------------- | ------------------- | -------------------------------------------------------------------------------------------------------- |
| `authority`             | `TransactionSigner` | The creator of the attestation and the associated token.                                                 |
| `payer`                 | `TransactionSigner` | The account that pays for all transaction fees and account rents.                                        |
| `attestation`           | `Address`           | The PDA for the attestation data account.                                                                |
| `attestationMint`       | `Address`           | The PDA for the token mint. This will be the token's unique address.                                     |
| `recipient`             | `Address`           | The public key of the wallet that will receive the newly minted token.                                   |
| `recipientTokenAccount` | `Address`           | The Associated Token Account (ATA) of the recipient for the `attestationMint`.                           |
| `sasPda`                | `Address`           | The PDA for the Solana Attestation Service itself, which acts as a required signer for token operations. |
| `data`                  | `Buffer`            | The serialized attestation data, which must conform to the specified schema.                             |
| `mintAccountSpace`      | `number`            | The calculated size in bytes needed for the mint account, including all specified Token-2022 extensions. |
| `tokenProgram`          | `Address`           | The address of the SPL Token-2022 Program.                                                               |
| _Various_               | _Address, string_   | Includes other required PDAs and metadata, such as `credential`, `schema`, `symbol`, `name`, and `uri`.  |
