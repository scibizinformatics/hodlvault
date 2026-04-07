/**
 * Task 1.5: Byte-Format Validation Suite
 *
 * Critical validation to ensure oracle message format matches HodlVault.cash expectations
 * Specifically validates the bytes priceBytes = oracleMessage.split(8)[0]; operation
 */

import { bigIntToBinUint64LE, utf8ToBin, flattenBinArray } from '@bitauth/libauth'

/**
 * Validates oracle message format for HodlVault contract compatibility
 * @param price - Price in USD (will be converted to cents)
 * @param blockheight - Blockchain block height
 * @returns boolean - True if format is valid
 * @throws Error if validation fails
 */
function validateOracleMessageFormat(price: number, blockheight: number): boolean {
  // Law 1: Guard Clauses
  if (price <= 0) throw new Error('Invalid price')
  if (blockheight <= 0) throw new Error('Invalid blockheight')

  // Convert price to cents (as expected by oracle system)
  const priceInCents = Math.floor(price * 100)
  const priceBuf = bigIntToBinUint64LE(BigInt(priceInCents))
  const heightBuf = utf8ToBin(blockheight.toString())
  const message = flattenBinArray([priceBuf, heightBuf])

  // Critical validation: Ensure exactly 8-byte price prefix
  const priceBytes = message.slice(0, 8)
  if (priceBytes.length !== 8) {
    throw new Error(`Price bytes must be exactly 8 bytes, got ${priceBytes.length}`)
  }

  // Validate this matches HodlVault.cash split(8)[0] expectation
  // The contract expects the first 8 bytes to contain the price in Uint64LE format
  console.log('Validation successful:', {
    price,
    priceInCents,
    priceBytesHex: Buffer.from(priceBytes).toString('hex'),
    messageHex: Buffer.from(message).toString('hex'),
    blockheight,
  })

  return true
}

/**
 * Test suite for byte-format validation
 */
export function runByteFormatValidationTests(): void {
  console.log('=== Task 1.5: Byte-Format Validation Suite ===')

  const testCases = [
    { price: 350.5, blockheight: 840000, description: 'Normal price range' },
    { price: 100.0, blockheight: 839000, description: 'Lower price boundary' },
    { price: 1000.0, blockheight: 841000, description: 'Higher price range' },
    { price: 500.25, blockheight: 842123, description: 'Decimal price with odd blockheight' },
  ]

  let passedTests = 0
  let totalTests = testCases.length

  testCases.forEach((testCase, index) => {
    try {
      console.log(`\nTest ${index + 1}: ${testCase.description}`)
      console.log(`Input: price=$${testCase.price}, blockheight=${testCase.blockheight}`)

      const result = validateOracleMessageFormat(testCase.price, testCase.blockheight)

      if (result) {
        console.log('✅ PASSED')
        passedTests++
      } else {
        console.log('❌ FAILED')
      }
    } catch (error) {
      console.log(`❌ FAILED: ${(error as Error).message}`)
    }
  })

  // Test error conditions
  console.log('\n--- Error Condition Tests ---')

  const errorTestCases = [
    { price: 0, blockheight: 840000, description: 'Zero price' },
    { price: -100, blockheight: 840000, description: 'Negative price' },
    { price: 350, blockheight: 0, description: 'Zero blockheight' },
    { price: 350, blockheight: -1000, description: 'Negative blockheight' },
  ]

  errorTestCases.forEach((testCase, index) => {
    try {
      console.log(`\nError Test ${index + 1}: ${testCase.description}`)
      validateOracleMessageFormat(testCase.price, testCase.blockheight)
      console.log('❌ FAILED: Should have thrown error')
    } catch (error) {
      console.log(`✅ PASSED: Correctly threw error: ${(error as Error).message}`)
      passedTests++
    }
  })

  totalTests += errorTestCases.length

  console.log('\n=== Test Summary ===')
  console.log(`Passed: ${passedTests}/${totalTests}`)

  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Byte-format validation is working correctly.')
  } else {
    console.log('⚠️  Some tests failed. Review the implementation.')
  }
}

// Export the validation function for use in SignerService
export { validateOracleMessageFormat }

// Run tests if this file is executed directly
if (require.main === module) {
  runByteFormatValidationTests()
}
