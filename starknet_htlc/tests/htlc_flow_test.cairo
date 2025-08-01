// mod test_htlc_workflow {
//     use core::{
//         array::ArrayTrait,
//         option::OptionTrait,
//         result::ResultTrait,
//         traits::{Into, TryInto},
//     };
//     use starknet::{
//         ContractAddress,
//         contract_address_const
//     };
//     use snforge_std::{
//         declare,
//         ContractClassTrait,
//         start_prank,
//         stop_prank,
//     };
//     use openzeppelin::token::erc20::interface::{
//         IERC20Dispatcher,
//         IERC20DispatcherTrait
//     };
//     use super::super::{
//         htlc_factory::{
//             IHTLCFactoryDispatcher,
//             IHTLCFactoryDispatcherTrait
//         },
//         htlc_escrow::{
//             IHTLCEscrowDispatcher,
//             IHTLCEscrowDispatcherTrait
//         }
//     };

//     #[test]
//     fn test_htlc_flow() {
//         // Setup test accounts
//         let maker = contract_address_const::<0x123>();
//         let taker = contract_address_const::<0x456>();

//         // Setup test parameters
//         let amount = u256 { low: 1000, high: 0 };
        
//         // Deploy Mock ERC20 token
//         let mut token_calldata = ArrayTrait::new();
//         token_calldata.append('Test Token');
//         token_calldata.append('TST');
//         token_calldata.append(18_u8.into());
//         token_calldata.append(1_000_000_u128.into());
//         token_calldata.append(0_u128.into());
//         token_calldata.append(maker.into());

//         let token_class = declare('mocks::mock_erc20').unwrap();
//         let token_address = token_class.deploy(@token_calldata).unwrap();
//         let token = IERC20Dispatcher { contract_address: token_address };

//         // Deploy HTLC Factory
//         let factory_class = declare('htlc_factory').unwrap();
//         let factory_address = factory_class.deploy(@ArrayTrait::new()).unwrap();
//         let factory = IHTLCFactoryDispatcher { contract_address: factory_address };

//         // Setup HTLC parameters
//         let secret = 'test_secret';
//         let secret_hash = secret; // For testing only
//         let expiry = 3600_u64;

//         // Create escrow as maker
//         start_prank(maker);
//         token.approve(factory_address, amount);
        
//         let escrow_address = factory.create_escrow(
//             token_address,
//             taker,
//             amount,
//             secret_hash,
//             expiry
//         );
//         stop_prank();

//         let escrow = IHTLCEscrowDispatcher { contract_address: escrow_address };
        
//         // Verify escrow state
//         assert(escrow.get_maker() == maker, 'Wrong maker');
//         assert(escrow.get_taker() == taker, 'Wrong taker');
//         assert(escrow.get_token() == token_address, 'Wrong token');
//         assert(escrow.get_amount() == amount, 'Wrong amount');
//         assert(escrow.get_secret_hash() == secret_hash, 'Wrong hash');
//         assert(token.balance_of(escrow_address) == amount, 'Wrong balance');

//         // Claim as taker
//         start_prank(taker);
//         escrow.claim(secret);
//         assert(token.balance_of(taker) == amount, 'Claim failed');
//         stop_prank();
//     }
// }

//     #[test]
//     fn test_htlc_workflow() {
//         let (maker, taker) = setup_test();
        
//         // Setup HTLC parameters
//         let secret = 'unlock';
//         let secret_hash = secret;  // For testing, we'll use the secret directly as hash
//         let amount = 1000_u128;
//         let amount_u256 = u256 { low: amount.into(), high: 0 };

//         // Deploy mock ERC20 token with initial supply to maker
//         let (token_addr, token) = deploy_mock_erc20(
//             maker, 
//             u256 { low: 1_000_000, high: 0 }
//         );

//         // Deploy HTLC factory
//         let mut factory_calldata = ArrayTrait::new();
//         let factory_contract = declare("HTLCFactory").unwrap();
//         let factory_addr = factory_contract.deploy(@factory_calldata).unwrap();
//         let factory = IHTLCFactoryDispatcher { contract_address: factory_addr };

//         // Start acting as maker to approve and transfer tokens
//         start_prank(maker);
//         token.approve(factory_addr, amount_u256);
        
//         // Create new HTLC escrow through factory
//         let lock_time = 3600_u64; // 1 hour
//         let escrow_addr = factory.create_escrow(
//             token_addr,
//             taker,
//             amount_u256,
//             secret_hash,
//             lock_time
//         );
        
//         // Get escrow contract dispatcher
//         let escrow = IHTLCEscrowDispatcher { contract_address: escrow_addr };
        
//         // Verify escrow state
//         assert(token.balance_of(escrow_addr) == amount_u256, 'Wrong escrow balance');
//         assert(escrow.get_maker() == maker, 'Wrong maker');
//         assert(escrow.get_taker() == taker, 'Wrong taker');
//         assert(escrow.get_token() == token_addr, 'Wrong token');
//         assert(escrow.get_amount() == amount_u256, 'Wrong amount');
//         assert(escrow.get_secret_hash() == secret_hash, 'Wrong secret hash');
        
//         // Stop acting as maker
//         stop_prank();

//         // Start acting as taker to claim funds
//         start_prank(taker);
//         escrow.claim(secret);
//         assert(token.balance_of(taker) == amount_u256, 'Claim failed');
//         stop_prank();

//     // Deploy factory
//     let factory_contract = declare("htlc_factory").unwrap();
//     let (factory_addr, _) = factory_contract.deploy(@ArrayTrait::new()).unwrap();
//     let factory = htlc_factoryDispatcher { contract_address: factory_addr };

//     // Maker approves factory to spend tokens
//     token.approve(factory_addr, amount_u256).unwrap();

//     // Transfer tokens from maker to factory
//     token.transfer(factory_addr, amount_u256).unwrap();

//     // Deploy escrow contract
//     let escrow_class = declare("htlc_escrow").unwrap();
//     let class_hash = escrow_class.class_hash().unwrap();

//     let salt = 0xABCD;
//     let timelock = get_block_timestamp().timestamp + 3600;

//     let escrow_addr = factory.deploy_escrow(
//         class_hash,
//         maker,
//         taker,
//         token_addr,
//         amount_u256,
//         secret_hash,
//         timelock,
//         salt
//     );

//     let escrow = htlc_escrowDispatcher { contract_address: escrow_addr.unwrap() };

//     // === CLAIM SUCCESSFULLY ===
//     let balance_before = token.balance_of(taker);
//     escrow.claim(secret.clone());
//     let balance_after = token.balance_of(taker);
//     assert_eq!(balance_after, balance_before + amount_u256);

//     // === CLAIM TWICE (FAIL) ===
//     match escrow.claim(secret.clone()) {
//         Result::Ok(_) => panic_with_felt252("Should not allow double claim"),
//         Result::Err(_) => (),
//     }

//     // === REDEPLOY + REFUND ===
//     token.transfer_from(maker, factory_addr, amount_u256).unwrap();

//     let escrow_addr2 = factory.deploy_escrow(
//         class_hash,
//         maker,
//         taker,
//         token_addr,
//         amount_u256,
//         secret_hash,
//         timelock - 3600, // expire immediately
//         salt + 1
//     );
//     let escrow2 = htlc_escrowDispatcher { contract_address: escrow_addr2.unwrap() };

//     // Try refund before timelock (FAIL)
//     match escrow.refund() {
//         Result::Ok(_) => panic_with_felt252("Too early for refund"),
//         Result::Err(_) => (),
//     }

//     // Simulate time travel: set block timestamp past timelock (test framework will need support)
//     // For now assume test environment lets you manipulate it manually.

//     // Refund succeeds
//     escrow2.refund();

//     // Claim after refund (FAIL)
//     match escrow2.claim(secret.clone()) {
//         Result::Ok(_) => panic_with_felt252("Cannot claim after refund"),
//         Result::Err(_) => (),
//     }
// }
