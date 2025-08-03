import { AuctionService } from '../services/AuctionService';
import { ChainUtils } from './chainUtils';

export class TestUtils {
  /**
   * Create a test order
   */
  static createTestOrder() {
    const currentTime = Math.floor(Date.now() / 1000);
    return {
      makerAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      takerAddress: '0xDestinationAddress1234567890abcdef1234567890abcdef', // Destination address
      makerChain: 'ethereum',
      takerChain: 'starknet',
      makingAmount: '100000000', // 100 USDC
      takingAmount: '99000000',   // 99 USDC
      makerAsset: '0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C8',
      takerAsset: '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf56a5',
      ethereumHashlock: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', // Ethereum hashlock
      starknetHashlock: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890', // Starknet hashlock
      timelocks: {
        srcWithdrawal: 10,
        dstWithdrawal: 10
      },
      auction: {
        initialRateBump: 0.05,
        duration: 120,
        startTime: currentTime
      },
      signature: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      orderNonce: `test-${Date.now()}`
    };
  }

  /**
   * Test Dutch auction calculation
   */
  static testAuctionCalculation() {
    const auction = {
      duration: 120,
      startTime: Math.floor(Date.now() / 1000)
    };

    const makingAmount = "100000000"; // 100 USDC
    const takingAmount = "95000000";  // 95 USDC
    const currentTime = auction.startTime + 60; // Halfway through auction
    const currentAmount = AuctionService.calculateCurrentAmount(auction, currentTime, makingAmount, takingAmount);
    
    console.log('Auction Test Results:');
    console.log('Making Amount:', makingAmount);
    console.log('Taking Amount:', takingAmount);
    console.log('Current Time:', currentTime);
    console.log('Current Amount:', currentAmount);
    console.log('Expected Amount: ~97500000 (halfway between 100 and 95)');
    
    return currentAmount && parseInt(currentAmount) > 95000000 && parseInt(currentAmount) < 100000000;
  }

  /**
   * Test effective amounts calculation
   */
  static testEffectiveAmounts() {
    const makingAmount = '100000000';
    const takingAmount = '95000000';
    const currentAmount = '97500000';

    const result = AuctionService.calculateEffectiveAmounts(makingAmount, takingAmount, currentAmount);
    
    console.log('Effective Amounts Test:');
    console.log('Original Making Amount:', makingAmount);
    console.log('Original Taking Amount:', takingAmount);
    console.log('Current Auction Amount:', currentAmount);
    console.log('Effective Fill Amount:', result.fillAmount);
    console.log('Effective Take Amount:', result.takeAmount);
    
    return result.fillAmount && result.takeAmount;
  }

  /**
   * Test hashlock generation and verification
   */
  static testHashlock() {
    const secret = 'my-secret-key-123';
    const ethereumHashlock = ChainUtils.generateHashlock(secret);
    const starknetHashlock = ChainUtils.generateHashlock(secret); // For now using same, but could be different
    const isValidEthereum = ChainUtils.verifyHashlock(secret, ethereumHashlock);
    const isValidStarknet = ChainUtils.verifyHashlock(secret, starknetHashlock);
    
    console.log('Hashlock Test:');
    console.log('Secret:', secret);
    console.log('Generated Ethereum Hashlock:', ethereumHashlock);
    console.log('Generated Starknet Hashlock:', starknetHashlock);
    console.log('Ethereum Verification Result:', isValidEthereum);
    console.log('Starknet Verification Result:', isValidStarknet);
    
    return isValidEthereum && isValidStarknet;
  }

  /**
   * Run all tests
   */
  static async runAllTests() {
    console.log('Running Relayer Service Tests...\n');
    
    const results = {
      auctionCalculation: this.testAuctionCalculation(),
      effectiveAmounts: this.testEffectiveAmounts(),
      hashlock: this.testHashlock()
    };
    
    console.log('\nTest Results:');
    console.log('Auction Calculation:', results.auctionCalculation ? 'PASS' : 'FAIL');
    console.log('Effective Amounts:', results.effectiveAmounts ? 'PASS' : 'FAIL');
    console.log('Hashlock:', results.hashlock ? 'PASS' : 'FAIL');
    
    const allPassed = Object.values(results).every(result => result);
    console.log('\nOverall Result:', allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
    
    return allPassed;
  }

  /**
   * Generate sample API requests
   */
  static getSampleRequests() {
    const testOrder = this.createTestOrder();
    
    return {
      createOrder: {
        method: 'POST',
        url: '/orders',
        body: testOrder
      },
      getPendingAuctions: {
        method: 'GET',
        url: '/orders?status=pending_auction'
      },
      assignOrder: {
        method: 'POST',
        url: '/orders/{orderId}/assign',
        body: {
          resolverAddress: '0xResolverContract123',
          effectiveAmount: '97500000'
        }
      },
      getOrderDetails: {
        method: 'GET',
        url: '/orders/{orderId}'
      },
      completeOrder: {
        method: 'POST',
        url: '/orders/{orderId}/complete',
        body: {
          status: 'filled',
          details: {
            srcClaimTx: '0x1234567890abcdef',
            dstClaimTx: '0xabcdef1234567890',
            resolverPayout: '1000000',
            makerReceived: '99000000'
          }
        }
      },
      secretRevealed: {
        method: 'POST',
        url: '/events/secret',
        body: {
          orderId: '{orderId}',
          secret: 'my-secret-key-123',
          revealedAt: new Date().toISOString(),
          sourceChain: 'starknet',
          txHash: '0x1234567890abcdef'
        }
      }
    };
  }
} 