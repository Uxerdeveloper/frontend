import { useQueryClient } from '@tanstack/react-query';
import React from 'react';

import type { SocketMessage } from 'lib/socket/types';
import type { Address } from 'types/api/address';
import { QueryKeys } from 'types/client/queries';

import appConfig from 'configs/app/config';
import useSocketChannel from 'lib/socket/useSocketChannel';
import useSocketMessage from 'lib/socket/useSocketMessage';
import CurrencyValue from 'ui/shared/CurrencyValue';
import DetailsInfoItem from 'ui/shared/DetailsInfoItem';
import TokenLogo from 'ui/shared/TokenLogo';

interface Props {
  data: Address;
}

const AddressBalance = ({ data }: Props) => {
  const [ lastBlockNumber, setLastBlockNumber ] = React.useState<number>(data.block_number_balance_updated_at || 0);
  const queryClient = useQueryClient();

  const updateData = React.useCallback((balance: string, exchangeRate: string, blockNumber: number) => {
    if (blockNumber < lastBlockNumber) {
      return;
    }

    setLastBlockNumber(blockNumber);
    queryClient.setQueryData([ QueryKeys.address, data.hash ], (prevData: Address | undefined) => {
      if (!prevData) {
        return;
      }
      return {
        ...prevData,
        coin_balance: balance,
        exchange_rate: exchangeRate,
        block_number_balance_updated_at: blockNumber,
      };
    });
  }, [ data.hash, lastBlockNumber, queryClient ]);

  const handleNewBalanceMessage: SocketMessage.AddressBalanceUpdate['handler'] = React.useCallback((payload) => {
    updateData(payload.balance, payload.exchange_rate, payload.block_number);
  }, [ updateData ]);

  const handleNewCoinBalanceMessage: SocketMessage.AddressCoinBalanceUpdate['handler'] = React.useCallback((payload) => {
    updateData(payload.coin_balance, payload.exchange_rate, payload.block_number);
  }, [ updateData ]);

  const channel = useSocketChannel({
    topic: `addresses:${ data.hash.toLowerCase() }`,
    isDisabled: !data.coin_balance,
  });
  useSocketMessage({
    channel,
    event: 'balance',
    handler: handleNewBalanceMessage,
  });
  useSocketMessage({
    channel,
    event: 'current_coin_balance',
    handler: handleNewCoinBalanceMessage,
  });

  if (!data.coin_balance) {
    return null;
  }

  return (
    <DetailsInfoItem
      title="Balance"
      hint={ `Address balance in ${ appConfig.network.currency.symbol }. Doesn't include ERC20, ERC721 and ERC1155 tokens.` }
    >
      <TokenLogo
        hash={ appConfig.network.currency.address }
        name={ appConfig.network.currency.name }
        boxSize={ 5 }
        mr={ 2 }
        fontSize="sm"
      />
      <CurrencyValue
        value={ data.coin_balance }
        exchangeRate={ data.exchange_rate }
        decimals={ String(appConfig.network.currency.decimals) }
        currency={ appConfig.network.currency.symbol }
        accuracyUsd={ 2 }
        accuracy={ 8 }
      />
    </DetailsInfoItem>
  );
};

export default React.memo(AddressBalance);
