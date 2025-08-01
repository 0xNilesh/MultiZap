#[starknet::contract]
mod htlc_escrow {
    use core::num::traits::Zero;
    use core::array::Span;
    use starknet::{ContractAddress, get_caller_address,};
    use core::byte_array::ByteArray;
    use core::{array::ArrayTrait, traits::Into,};
    use starknet::storage::StoragePointerReadAccess;
    use starknet::storage::StoragePointerWriteAccess;
    use core::keccak::compute_keccak_byte_array;
    use starknet::{get_block_info};

    #[derive(Drop, starknet::Event)]
    struct Claimed {
        #[key]
        taker: ContractAddress,
        amount: u256,
        secret: ByteArray,
    }

    #[derive(Drop, starknet::Event)]
    struct Refunded {
        #[key]
        maker: ContractAddress,
        amount: u256
    }

    #[starknet::interface]
    trait IERC20<TContractState> {
        fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    }

    #[starknet::interface]
    trait IHTLCEscrow<TContractState> {
        fn claim(ref self: TContractState, secret: ByteArray);
        fn refund(ref self: TContractState);
        fn get_maker_address(self: @TContractState) -> ContractAddress;
        fn get_taker_address(self: @TContractState) -> ContractAddress;
        fn get_token_address(self: @TContractState) -> ContractAddress;
        fn get_amount(self: @TContractState) -> u256;
        fn get_secret_hash(self: @TContractState) -> u256;
        fn get_timelock(self: @TContractState) -> u64;
        fn get_keccak_hash(self: @TContractState, secret: ByteArray) -> u256;
        fn get_keccak_hash_felt252(self: @TContractState, secret: ByteArray) -> (felt252, felt252);
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Claimed: Claimed,
        Refunded: Refunded,
    }

    #[storage]
    struct Storage {
        maker: ContractAddress,
        taker: ContractAddress,
        token: ContractAddress,
        amount: u256,
        secret_hash: u256,
        timelock: u64,
        claimed: bool,
        refunded: bool,
        secret: ByteArray,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        maker: ContractAddress,
        taker: ContractAddress,
        token: ContractAddress,
        amount: u256,
        secret_hash: u256,
        timelock: u64,
    ) {
        let block_info = get_block_info();
        assert(block_info.block_timestamp < timelock, 'Timelock must be in future');
        assert(!maker.is_zero() && !taker.is_zero(), 'Zero address');

        self.maker.write(maker);
        self.taker.write(taker);
        self.token.write(token);
        self.amount.write(amount);
        self.secret_hash.write(secret_hash);
        self.timelock.write(timelock);
        self.claimed.write(false);
        self.refunded.write(false);
    }

    #[abi(embed_v0)]
    impl HTLCEscrow of IHTLCEscrow<ContractState> {
        fn claim(ref self: ContractState, secret: ByteArray) {
            let caller = get_caller_address();
            let taker = self.taker.read();
            // let maker = self.maker.read();
            let claimed = self.claimed.read();
            let refunded = self.refunded.read();
            let secret_hash = self.secret_hash.read();
            let amount = self.amount.read();

            assert(caller == taker, 'Not taker');
            assert(!claimed && !refunded, 'Already claimed or refunded');
            assert(compute_keccak_byte_array(@secret) == secret_hash, 'Invalid secret');

            self.claimed.write(true);
            self.secret.write(secret);

            let token = self.token.read();
            let erc20 = IERC20Dispatcher { contract_address: token };
            erc20.transfer(taker, amount);

            self
                .emit(
                    Event::Claimed(
                        Claimed { taker: taker, amount: amount, secret: self.secret.read() }
                    )
                );
        }

        fn refund(ref self: ContractState) {
            let caller = get_caller_address();
            let maker = self.maker.read();
            let claimed = self.claimed.read();
            let refunded = self.refunded.read();
            let timelock = self.timelock.read();
            let amount = self.amount.read();

            assert(caller == maker, 'Not maker');
            assert(!claimed && !refunded, 'Already claimed or refunded');
            let block_info = get_block_info();
            assert(block_info.block_timestamp >= timelock, 'Timelock not expired');

            self.refunded.write(true);

            let token = self.token.read();
            let erc20 = IERC20Dispatcher { contract_address: token };
            erc20.transfer(maker, amount);

            self.emit(Event::Refunded(Refunded { maker: maker, amount: amount }));
        }

        fn get_maker_address(self: @ContractState) -> ContractAddress {
            self.maker.read()
        }

        fn get_taker_address(self: @ContractState) -> ContractAddress {
            self.taker.read()
        }

        fn get_token_address(self: @ContractState) -> ContractAddress {
            self.token.read()
        }

        fn get_amount(self: @ContractState) -> u256 {
            self.amount.read()
        }

        fn get_secret_hash(self: @ContractState) -> u256 {
            self.secret_hash.read()
        }

        fn get_timelock(self: @ContractState) -> u64 {
            self.timelock.read()
        }

        fn get_keccak_hash(self: @ContractState, secret: ByteArray) -> u256 {
            compute_keccak_byte_array(@secret)
        }

        fn get_keccak_hash_felt252(self: @ContractState, secret: ByteArray) -> (felt252, felt252) {
            return (compute_keccak_byte_array(@secret).try_into().unwrap(), self.secret_hash.read().try_into().unwrap());
        }
    }
}
