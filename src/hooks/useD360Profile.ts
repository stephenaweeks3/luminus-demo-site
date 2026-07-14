import { useState, useEffect, useCallback } from 'react'
import type { D360Profile, Order } from '../types'

// SKU → product name (sourced from Salesforce Product2)
const PRODUCT_NAMES: Record<string, string> = {
  'LMN-01001': 'Variable Green Electricity',
  'LMN-01002': 'Fixed Green Electricity',
  'LMN-01003': 'Fixed Standard Electricity',
  'LMN-01004': 'Smart Home Electricity',
  'LMN-01005': 'Easy Gas',
  'LMN-01006': 'Fixed Gas',
  'LMN-01007': 'Green Gas',
  'LMN-01008': 'Solar Basic 4kWp',
  'LMN-01009': 'Solar Plus 6kWp',
  'LMN-01010': 'Solar Premium 8kWp',
  'LMN-01011': 'Home Battery 5kWh',
  'LMN-01012': 'Home Battery 10kWh',
  'LMN-01013': 'Wallbox Basic 7.4kW',
  'LMN-01014': 'Wallbox Smart 11kW',
}

interface SFQueryResult {
  totalSize: number
  records: Array<{
    Id: string; FirstName: string; LastName: string; Email: string
    energy_product_type__c: string | null
  }>
}

interface CDPQueryResult {
  data?: Array<Record<string, string | number | null>>
}

async function cdpQuery(sql: string): Promise<CDPQueryResult> {
  try {
    const r = await fetch('/cdp-api/api/v1/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ sql }),
    })
    if (!r.ok) {
      const body = await r.text()
      console.warn('[D360] CDP query failed', r.status, body.slice(0, 200))
      return { data: [] }
    }
    return r.json()
  } catch (e) {
    console.warn('[D360] CDP query error', e)
    return { data: [] }
  }
}

// Lookup all CI values via CPE → IIL → UnifiedIndividual JOINs (single query).
const CI_JOIN_SQL = (email: string) => `
SELECT
  iil.UnifiedRecordId__c,
  churn.value__c  AS churn_score,
  tier.value__c   AS tier,
  spend.value__c  AS total_spend,
  bill.value__c   AS avg_bill,
  cnt.value__c    AS contract_count,
  gas.value__c    AS has_gas,
  solar.value__c  AS has_solar,
  tariff.value__c AS last_tariff
FROM ssot__ContactPointEmail__dlm cpe
JOIN IndividualIdentityLink__dlm iil
  ON cpe.ssot__PartyId__c = iil.SourceRecordId__c
LEFT JOIN LMN_ChurnRiskScore__cio    churn  ON iil.UnifiedRecordId__c = churn.unified_individual__c
LEFT JOIN LMN_CustomerTier__cio      tier   ON iil.UnifiedRecordId__c = tier.unified_individual__c
LEFT JOIN LMN_TotalEnergySpend__cio  spend  ON iil.UnifiedRecordId__c = spend.unified_individual__c
LEFT JOIN LMN_AvgMonthlyBill__cio    bill   ON iil.UnifiedRecordId__c = bill.unified_individual__c
LEFT JOIN LMN_ContractCount__cio     cnt    ON iil.UnifiedRecordId__c = cnt.unified_individual__c
LEFT JOIN LMN_GasContractFlag__cio   gas    ON iil.UnifiedRecordId__c = gas.unified_individual__c
LEFT JOIN LMN_SolarOwnerFlag__cio    solar  ON iil.UnifiedRecordId__c = solar.unified_individual__c
LEFT JOIN LMN_LastTariffReviewDate__cio tariff ON iil.UnifiedRecordId__c = tariff.unified_individual__c
WHERE cpe.ssot__EmailAddress__c = '${email}'
LIMIT 1`

// Fallback: count orders directly via CPE → SalesOrder when IIL is incomplete.
const ORDER_COUNT_SQL = (email: string) => `
SELECT COUNT(so.ssot__Id__c) AS order_count
FROM ssot__ContactPointEmail__dlm cpe
JOIN ssot__SalesOrder__dlm so ON so.ssot__SoldToCustomerId__c = cpe.ssot__PartyId__c
WHERE cpe.ssot__EmailAddress__c = '${email}'`

// Orders + order lines in one query — grouped in JS after fetch.
const ORDERS_SQL = (email: string) => `
SELECT
  so.ssot__Id__c            AS order_id,
  so.ssot__OrderStartDate__c AS order_date,
  so.ssot__TotalAmount__c   AS order_total,
  ol.ssot__ProductId__c     AS product_id
FROM ssot__ContactPointEmail__dlm cpe
JOIN ssot__SalesOrder__dlm so
  ON so.ssot__SoldToCustomerId__c = cpe.ssot__PartyId__c
JOIN ssot__SalesOrderProduct__dlm ol
  ON ol.ssot__SalesOrderId__c = so.ssot__Id__c
WHERE cpe.ssot__EmailAddress__c = '${email}'
ORDER BY so.ssot__OrderStartDate__c DESC
LIMIT 50`

export function useD360Profile(email: string | null) {
  const [profile, setProfile] = useState<D360Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (em: string) => {
    setLoading(true)
    setError(null)
    try {
      // 1. Resolve CRM Contact (name + ID + energy type for CDP fallback)
      const q = `SELECT Id,FirstName,LastName,Email,energy_product_type__c FROM Contact WHERE Email='${em}' LIMIT 1`
      const qRes = await fetch(
        `/services/data/v62.0/query?q=${encodeURIComponent(q)}`,
        { headers: { Accept: 'application/json' } },
      )
      if (!qRes.ok) throw new Error(`SOQL ${qRes.status}`)
      const qData: SFQueryResult = await qRes.json()
      if (!qData.totalSize) throw new Error('Contact not found')
      const contact = qData.records[0]

      // 2. CI values + orders in parallel
      const [ciRes, ordersRes] = await Promise.all([
        cdpQuery(CI_JOIN_SQL(em)),
        cdpQuery(ORDERS_SQL(em)),
      ])
      const ciRow = ciRes.data?.[0] ?? {}

      // Build orders: group order-line rows by order_id
      const orderMap = new Map<string, Order>()
      for (const row of ordersRes.data ?? []) {
        const id  = String(row['order_id'] ?? '')
        const sku = String(row['product_id'] ?? '')
        if (!id) continue
        if (!orderMap.has(id)) {
          orderMap.set(id, {
            orderId: id,
            date: String(row['order_date'] ?? ''),
            total: Number(row['order_total'] ?? 0),
            products: [],
          })
        }
        const name = PRODUCT_NAMES[sku] ?? sku
        const order = orderMap.get(id)!
        if (!order.products.includes(name)) order.products.push(name)
      }
      const orders = Array.from(orderMap.values())

      // 3. Derive churn risk score (0–1, higher = more at risk):
      //    - CI path: LMN_ChurnRiskScore__cio.value__c is a 0–10 scale (7 = 70% risk) → divide by 10
      //    - Fallback: count orders directly; fewer orders = newer/less loyal customer = higher churn
      const ciChurnRaw = ciRow['churn_score'] != null ? Number(ciRow['churn_score']) : null
      let churnRiskScore = 0
      if (ciChurnRaw != null) {
        churnRiskScore = Math.min(ciChurnRaw, 10) / 10
        console.log('[D360] CI churn_score:', ciChurnRaw, '→', churnRiskScore, 'tier:', ciRow['tier'])
      } else {
        const fallRes = await cdpQuery(ORDER_COUNT_SQL(em))
        const fallCount = fallRes.data?.[0]?.['order_count']
        if (fallCount != null) {
          churnRiskScore = Math.max(0, 1 - Math.min(Number(fallCount), 10) / 10)
          console.log('[D360] fallback order count:', fallCount, '→', churnRiskScore)
        }
      }

      const tierRaw   = ciRow['tier']
      const spendRaw  = ciRow['total_spend']
      const billRaw   = ciRow['avg_bill']
      const countRaw  = ciRow['contract_count']
      const gasRaw    = ciRow['has_gas']
      const solarRaw  = ciRow['has_solar']
      const tariffRaw = ciRow['last_tariff']

      setProfile({
        contactId: contact.Id,
        firstName: contact.FirstName,
        lastName: contact.LastName,
        email: contact.Email,
        ci: {
          churnRiskScore,
          customerTier: tierRaw != null ? String(tierRaw) : 'Basic',
          totalEnergySpend: spendRaw != null ? Number(spendRaw) : 0,
          avgMonthlyBill: billRaw != null ? Number(billRaw) : 0,
          contractCount: countRaw != null ? Number(countRaw) : 0,
          hasGasContract: gasRaw != null && Number(gasRaw) > 0,
          // Fall back to CRM field when CDP CI is unavailable (e.g. IIL gap for this individual)
          hasSolar: solarRaw != null ? Number(solarRaw) > 0 : contact.energy_product_type__c === 'Solar',
          lastTariffReviewDate: tariffRaw != null ? String(tariffRaw) : null,
        },
        segments: [],
        orders,
      })
    } catch (err) {
      setError(String(err))
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!email) { setProfile(null); return }
    load(email)
  }, [email, load])

  return { profile, loading, error }
}
