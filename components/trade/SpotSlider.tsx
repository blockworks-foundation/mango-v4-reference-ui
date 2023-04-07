import { MangoAccount, Serum3Market } from '@blockworks-foundation/mango-v4'
import mangoStore from '@store/mangoStore'
import { useMemo } from 'react'
import { GenericMarket } from 'types'

export const useSpotMarketMax = (
  mangoAccount: MangoAccount | undefined,
  selectedMarket: GenericMarket | undefined,
  side: string,
  useMargin: boolean
) => {
  const max = useMemo(() => {
    const group = mangoStore.getState().group
    if (!mangoAccount || !group || !selectedMarket) return 100
    if (!(selectedMarket instanceof Serum3Market)) return 100

    let leverageMax = 0
    let spotMax = 0
    try {
      if (side === 'buy') {
        leverageMax = mangoAccount.getMaxQuoteForSerum3BidUi(
          group,
          selectedMarket.serumMarketExternal
        )
        spotMax = mangoAccount.getTokenBalanceUi(
          group.getFirstBankByTokenIndex(selectedMarket.quoteTokenIndex)
        )
      } else {
        leverageMax = mangoAccount.getMaxBaseForSerum3AskUi(
          group,
          selectedMarket.serumMarketExternal
        )
        spotMax = mangoAccount.getTokenBalanceUi(
          group.getFirstBankByTokenIndex(selectedMarket.baseTokenIndex)
        )
      }
      return useMargin ? leverageMax : Math.max(spotMax, 0)
    } catch (e) {
      console.error('Error calculating max leverage: spot btn group: ', e)
      return 0
    }
  }, [side, selectedMarket, mangoAccount, useMargin])

  return max
}
