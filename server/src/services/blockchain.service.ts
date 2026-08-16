import crypto from 'crypto';

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

export class BlockchainService {
  /**
   * Calculates SHA-256 hash for a block payload
   */
  static calculateHash(data: BlockData): string {
    const payload = `${data.blockNumber}:${data.prevHash}:${data.txnId}:${data.amount}:${data.donorId}:${data.ngoId}:${data.projectId}:${new Date(data.timestamp).toISOString()}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Verifies that each block's currentHash matches SHA-256 calculation and prevHash links correctly
   */
  static verifyChainIntegrity(blocks: Array<BlockData & { currentHash: string }>): { isValid: boolean; errorBlockIndex?: number; message: string } {
    if (blocks.length === 0) {
      return { isValid: true, message: 'Ledger is empty' };
    }

    for (let i = 0; i < blocks.length; i++) {
      const currentBlock = blocks[i];
      const recalculatedHash = this.calculateHash(currentBlock);

      if (recalculatedHash !== currentBlock.currentHash) {
        return {
          isValid: false,
          errorBlockIndex: i,
          message: `Block #${currentBlock.blockNumber} hash mismatch! Computed ${recalculatedHash.substring(0, 10)}... vs stored ${currentBlock.currentHash.substring(0, 10)}...`
        };
      }

      if (i > 0) {
        const previousBlock = blocks[i - 1];
        if (currentBlock.prevHash !== previousBlock.currentHash) {
          return {
            isValid: false,
            errorBlockIndex: i,
            message: `Block #${currentBlock.blockNumber} prevHash does not match Block #${previousBlock.blockNumber} currentHash!`
          };
        }
      }
    }

    return { isValid: true, message: 'Cryptographic ledger integrity verified. All hashes valid and unbroken.' };
  }
}
