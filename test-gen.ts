import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve('server/.env') })

import { generateItineraryAdaCode } from './server/services/adacode.js'

console.log('KEY:', process.env.ADACODE_API_KEY?.slice(0,20), '...')

try {
  const r = await generateItineraryAdaCode({ destination: 'Bali', days: 1 })
  console.log('✅ days:', r.itinerary?.length)
  console.log('   item[0]:', r.itinerary?.[0]?.items?.[0]?.title)
  console.log('   full JSON keys:', Object.keys(r))
} catch(e: any) {
  console.error('❌', e.message)
}
