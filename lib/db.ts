import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { RepairOrder, AuditSession } from '@/types'

interface ROAuditDB extends DBSchema {
  repair_orders: {
    key: string
    value: RepairOrder
    indexes: { 'by-date': string; 'by-ro-number': string }
  }
  audit_sessions: {
    key: string
    value: AuditSession
  }
}

let _db: IDBPDatabase<ROAuditDB> | null = null

async function getDB(): Promise<IDBPDatabase<ROAuditDB>> {
  if (_db) return _db
  _db = await openDB<ROAuditDB>('ro-au…(truncated)