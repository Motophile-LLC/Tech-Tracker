import { RepairOrder, SummaryLineItem } from '@/types'

function parseJSON<T>(raw: string): T {
  const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  return JSON.parse(cleaned)
}

export async function extractROFromPhotos(
  photos: string[],
  apiKey: string
): Promise<Partial<RepairOrder>> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.05,
      max_tokens: 3500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are reading a vehicle Repair Order (RO). Extract all data you can see.
Return ONLY valid JSON — no markdown, no explanation — matching this schema exactly:

{
  "roNumber": "string",
  "date": "YYYY-MM-DD",
  "vehicleInfo": "year make model trim",
  "customer": "string",
  "events": [
    {
      "concern": "customer concern / complaint",
      "cause": "technician diagnosis",
      "correction": "work performed / repair",
      "laborLines": [
        {
          "opCode": "string",
          "description": "string",
          "flatRateHours": 0.0,
          "payType": "CP"
        }
      ]
    }
  ]
}

Rules:
- Extract ALL concerns/events on the RO (there may be 1-10 per RO)
- Each concern = one event; each event may have multiple labor lines
- payType: CP=Customer Pay, WR=Warranty, INT=Internal/Shop, FLT=Fleet — default to "CP" if unclear
- If flatRateHours is not shown, use 0
- Use today's date (${new Date().toISOString().split('T')[0]}) if date is not visible`
          },
          ...photos.map(photo => ({
            type: 'image_url' as const,
            image_url: { url: photo, detail: 'high' as const }
          }))
        ]
      }]
    })
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } })?.error?.message || `OpenAI error ${res.status}`)
  }

  const data = await res.json() as { choices: { message: { content: string } }[] }
  return parseJSON<Partial<RepairOrder>>(data.choices[0].message.content)
}

export async function extractSummaryFromPhotos(
  photos: string[],
  apiKey: string
): Promise<SummaryLineItem[]> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.05,
      max_tokens: 3500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `This is a mechanic/technician pay summary sheet, productivity report, or pay stub.
Extract every line item showing repair orders and their flat-rate hours.
Return ONLY a valid JSON array — no markdown, no explanation:

[
  {
    "roNumber": "RO number as shown",
    "description": "job or operation description",
    "hours": 0.0,
    "payType": "CP"
  }
]

Rules:
- Extract EVERY line item you can see
- payType: CP=Customer Pay, WR=Warranty, INT=Internal, FLT=Fleet — default "CP" if unclear
- If a single RO appears multiple times, keep them as separate line items
- roNumber should be exactly as printed on the document`
          },
          ...photos.map(photo => ({
            type: 'image_url' as const,
            image_url: { url: photo, detail: 'high' as const }
          }))
        ]
      }]
    })
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } })?.error?.message || `OpenAI error ${res.status}`)
  }

  const data = await res.json() as { choices: { message: { content: string } }[] }
  return parseJSON<SummaryLineItem[]>(data.choices[0].message.content)
}
