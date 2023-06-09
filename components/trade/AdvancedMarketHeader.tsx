import { Bank, PerpMarket } from '@blockworks-foundation/mango-v4'
import { IconButton } from '@components/shared/Button'
import { ChartBarIcon } from '@heroicons/react/20/solid'
import mangoStore from '@store/mangoStore'
import useSelectedMarket from 'hooks/useSelectedMarket'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import {
  formatCurrencyValue,
  getDecimalCount,
  numberCompacter,
} from 'utils/numbers'
import MarketSelectDropdown from './MarketSelectDropdown'
import PerpFundingRate from './PerpFundingRate'
import { BorshAccountsCoder } from '@coral-xyz/anchor'

const AdvancedMarketHeader = ({
  showChart,
  setShowChart,
}: {
  showChart?: boolean
  setShowChart?: (x: boolean) => void
}) => {
  const { t } = useTranslation(['common', 'trade'])
  // const perpStats = mangoStore((s) => s.perpStats.data)
  const {
    serumOrPerpMarket,
    price: stalePrice,
    selectedMarket,
  } = useSelectedMarket()
  // const selectedMarketName = mangoStore((s) => s.selectedMarket.name)
  const connection = mangoStore((s) => s.connection)
  const [price, setPrice] = useState(stalePrice)

  //subscribe to the market oracle account
  useEffect(() => {
    const client = mangoStore.getState().client
    const group = mangoStore.getState().group
    if (!group || !selectedMarket) return
    let marketOrBank: PerpMarket | Bank
    let decimals: number
    if (selectedMarket instanceof PerpMarket) {
      marketOrBank = selectedMarket
      decimals = selectedMarket.baseDecimals
    } else {
      const baseBank = group.getFirstBankByTokenIndex(
        selectedMarket.baseTokenIndex
      )
      marketOrBank = baseBank
      decimals = group.getMintDecimals(baseBank.mint)
    }

    const coder = new BorshAccountsCoder(client.program.idl)
    const subId = connection.onAccountChange(
      marketOrBank.oracle,
      async (info, _context) => {
        // selectedMarket = mangoStore.getState().selectedMarket.current
        // if (!(selectedMarket instanceof PerpMarket)) return
        const { price, uiPrice, lastUpdatedSlot } =
          await group.decodePriceFromOracleAi(
            coder,
            marketOrBank.oracle,
            info,
            decimals,
            client
          )
        marketOrBank._price = price
        marketOrBank._uiPrice = uiPrice
        setPrice(uiPrice)
        marketOrBank._oracleLastUpdatedSlot = lastUpdatedSlot
      },
      'processed'
    )
    return () => {
      if (typeof subId !== 'undefined') {
        connection.removeAccountChangeListener(subId)
      }
    }
  }, [connection, selectedMarket])

  useEffect(() => {
    if (serumOrPerpMarket instanceof PerpMarket) {
      const actions = mangoStore.getState().actions
      actions.fetchPerpStats()
    }
  }, [serumOrPerpMarket])

  return (
    <div className="flex flex-col bg-th-bkg-1 md:h-12 md:flex-row md:items-center">
      <div className="w-full px-4 md:w-auto md:px-6 md:py-0 lg:pb-0">
        <MarketSelectDropdown />
      </div>
      <div className="hide-scroll flex w-full items-center justify-between overflow-x-auto border-t border-th-bkg-3 py-2 px-5 md:border-t-0 md:py-0 md:px-0">
        <div className="flex items-center">
          <div
            id="trade-step-two"
            className="flex-col whitespace-nowrap md:ml-6"
          >
            <div className="text-xs text-th-fgd-4">
              {t('trade:oracle-price')}
            </div>
            <div className="font-mono text-xs text-th-fgd-2">
              {price ? (
                `${formatCurrencyValue(
                  price,
                  getDecimalCount(serumOrPerpMarket?.tickSize || 0.01)
                )}`
              ) : (
                <span className="text-th-fgd-4">–</span>
              )}
            </div>
          </div>
          {serumOrPerpMarket instanceof PerpMarket ? (
            <>
              <div className="ml-6 flex-col whitespace-nowrap">
                <div className="text-xs text-th-fgd-4">
                  {t('trade:funding-rate')}
                </div>
                <PerpFundingRate />
              </div>
              <div className="ml-6 flex-col whitespace-nowrap text-xs">
                <div className="text-th-fgd-4">{t('trade:open-interest')}</div>
                <span className="font-mono">
                  $
                  {numberCompacter.format(
                    serumOrPerpMarket.baseLotsToUi(
                      serumOrPerpMarket.openInterest
                    ) * serumOrPerpMarket.uiPrice
                  )}
                  <span className="mx-1">|</span>
                  {numberCompacter.format(
                    serumOrPerpMarket.baseLotsToUi(
                      serumOrPerpMarket.openInterest
                    )
                  )}{' '}
                  <span className="font-body text-th-fgd-3">
                    {serumOrPerpMarket.name.split('-')[0]}
                  </span>
                </span>
              </div>
            </>
          ) : null}
        </div>
        {setShowChart ? (
          <div className="ml-6">
            <IconButton
              className={showChart ? 'text-th-active' : 'text-th-fgd-2'}
              onClick={() => setShowChart(!showChart)}
              hideBg
            >
              <ChartBarIcon className="h-5 w-5" />
            </IconButton>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default AdvancedMarketHeader
