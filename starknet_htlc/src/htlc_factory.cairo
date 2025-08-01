#[starknet::contract]
pub mod htlc_factory {
    use starknet::storage::StoragePointerReadAccess;
    use starknet::storage::StoragePointerWriteAccess;
    // use starknet::contract_address::compute_contract_address;
    use starknet::{
        ContractAddress, ClassHash, get_caller_address, syscalls::deploy_syscall,
    };
    // use starknet::{ContractAddress, get_caller_address, EthAddress, contract_address_const};
    use core::{array::ArrayTrait, result::ResultTrait, traits::Into,};

    #[storage]
    struct Storage {
        escrow_class_hash: ClassHash,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        EscrowDeployed: EscrowDeployed,
    }

    #[derive(Drop, starknet::Event)]
    pub struct EscrowDeployed {
        escrow: ContractAddress,
        deployer: ContractAddress,
        salt: felt252,
    }

    #[starknet::interface]
    trait IERC20<TContractState> {
        fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
        fn transfer_from(ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool;
    }

    #[starknet::interface]
    trait IHTLCFactory<TContractState> {
        fn deploy_escrow(
            ref self: TContractState,
            maker: ContractAddress,
            taker: ContractAddress,
            token: ContractAddress,
            amount: u256,
            secret_hash: u256,
            timelock: u64,
            salt: felt252,
        ) -> ContractAddress;

        fn get_escrow_class_hash(self: @TContractState) -> ClassHash;
    }

    #[constructor]
    fn constructor(ref self: ContractState, escrow_class_hash: ClassHash) {
        self.escrow_class_hash.write(escrow_class_hash);
    }

    #[abi(embed_v0)]
    impl HTLCFactory of IHTLCFactory<ContractState> {
        fn deploy_escrow(
            ref self: ContractState,
            maker: ContractAddress,
            taker: ContractAddress,
            token: ContractAddress,
            amount: u256,
            secret_hash: u256,
            timelock: u64,
            salt: felt252,
        ) -> ContractAddress {
            let caller = get_caller_address();

            let mut calldata = ArrayTrait::new();
            calldata.append(maker.into());
            calldata.append(taker.into());
            calldata.append(token.into());
            calldata.append(amount.low.into());
            calldata.append(amount.high.into());
            calldata.append(secret_hash.low.into());
            calldata.append(secret_hash.high.into());
            calldata.append(timelock.into());

            let (address, _) = deploy_syscall(
                self.escrow_class_hash.read(), salt, calldata.span(), false
            )
                .unwrap();

            // Transfer tokens to escrow using IERC20 dispatcher
            let erc20 = IERC20Dispatcher { contract_address: token };
            erc20.transfer_from(maker, address, amount);

            // Emit deployment event
            self
                .emit(
                    Event::EscrowDeployed(
                        EscrowDeployed { escrow: address, deployer: caller, salt }
                    )
                );

            address
        }

        fn get_escrow_class_hash(self: @ContractState) -> ClassHash {
            self.escrow_class_hash.read()
        }
    }
}
