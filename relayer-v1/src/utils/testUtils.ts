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
      makerChain: 'ethereum',
      takerChain: 'starknet',
      makingAmount: '100000000', // 100 USDC
      takingAmount: '99000000',   // 99 USDC
      makerAsset: '0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C8',
      takerAsset: '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf56a5',
      hashlock: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
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
      initialRateBump: 0.05,
      duration: 120,
      startTime: Math.floor(Date.now() / 1000)
    };

    const currentTime = auction.startTime + 60; // Halfway through auction
    const currentBump = AuctionService.calculateCurrentBump(auction, currentTime);
    
    console.log('Auction Test Results:');
    console.log('Initial Rate Bump:', auction.initialRateBump);
    console.log('Current Time:', currentTime);
    console.log('Current Bump:', currentBump);
    console.log('Expected Bump:', auction.initialRateBump * 0.5);
    
    return Math.abs(currentBump - (auction.initialRateBump * 0.5)) < 0.001;
  }

  /**
   * Test effective amounts calculation
   */
  static testEffectiveAmounts() {
    const makingAmount = '100000000';
    const takingAmount = '99000000';
    const rateBump = 0.032;

    const result = ChainUtils.calculateEffectiveAmounts(makingAmount, takingAmount, rateBump);
    
    console.log('Effective Amounts Test:');
    console.log('Original Making Amount:', makingAmount);
    console.log('Original Taking Amount:', takingAmount);
    console.log('Rate Bump:', rateBump);
    console.log('Effective Fill Amount:', result.fillAmount);
    console.log('Effective Take Amount:', result.takeAmount);
    
    return result.fillAmount && result.takeAmount;
  }

  /**
   * Test hashlock generation and verification
   */
  static testHashlock() {
    const secret = 'my-secret-key-123';
    const hashlock = ChainUtils.generateHashlock(secret);
    const isValid = ChainUtils.verifyHashlock(secret, hashlock);
    
    console.log('Hashlock Test:');
    console.log('Secret:', secret);
    console.log('Generated Hashlock:', hashlock);
    console.log('Verification Result:', isValid);
    
    return isValid;
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
          effectiveBump: 0.032
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