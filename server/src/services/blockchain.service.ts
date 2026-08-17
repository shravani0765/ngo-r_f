import crypto from 'crypto';

/** prevHash of the first block — there is nothing before it. */
export const GENESIS_HASH = '0'.repeat(64);

export interface BlockData {
  blockNumber: number;
  prevHash: string;
  txnId: string;
  amount: number;
  donorId: string;
  ngoId: string;
  projectId: string;
  timestamp: string | Date;
}

export interface ChainVerification {
  isValid: boolean;
  errorBlockIndex?: number;
  brokenBlockNumber?: number;
  message: string;
  checkedCount: number;
}

export class BlockchainService {
  /**
   * SHA-256 over the block's fields plus the previous block's hash, which is
   * what chains the records together: editing any past record changes its hash
   * and breaks every link after it.
   */
  static calculateHash(data: BlockData): string {
    const payload = [
      data.blockNumber,
      data.prevHash,
      data.txnId,
      data.amount,
      data.donorId,
      data.ngoId,
      data.projectId,
      new Date(data.timestamp).toISOString()
    ].join(':');

    return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
  }

  /** Re-computes every hash and checks each block still points at the last one. */
  static verifyChainIntegrity(
    blocks: Array<BlockData & { currentHash: string }>
  ): ChainVerification {
    if (blocks.length === 0) {
      return {
        isValid: true,
        checkedCount: 0,
        message: 'No donations recorded yet, so there is nothing to check.'
      };
    }

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const recalculated = this.calculateHash(block);

      if (recalculated !== block.currentHash) {
        return {
          isValid: false,
          errorBlockIndex: i,
          brokenBlockNumber: block.blockNumber,
          checkedCount: blocks.length,
          message: `Record #${block.blockNumber} has been changed since it was written. Its fingerprint no longer matches.`
        };
      }

      const expectedPrev = i === 0 ? GENESIS_HASH : blocks[i - 1].currentHash;
      if (block.prevHash !== expectedPrev) {
        return {
          isValid: false,
          errorBlockIndex: i,
          brokenBlockNumber: block.blockNumber,
          checkedCount: blocks.length,
          message: `Record #${block.blockNumber} no longer links to the record before it. A record may have been removed or inserted.`
        };
      }
    }

    return {
      isValid: true,
      checkedCount: blocks.length,
      message: `All ${blocks.length} donation record${blocks.length === 1 ? '' : 's'} are intact and unchanged.`
    };
  }
}
