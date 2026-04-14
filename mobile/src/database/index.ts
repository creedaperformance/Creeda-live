import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'

import { schema } from './schema'
import { Profile, DailyCheckin, Notification } from './models'

// Set up the SQLite adapter (offline-first persistent storage)
const adapter = new SQLiteAdapter({
  schema,
  // (You might want to pass migrations here as the app grows)
  dbName: 'creeda_db', 
  jsi: true, // fast JSI mode for high performance array transfers
})

export const database = new Database({
  adapter,
  modelClasses: [
    Profile,
    DailyCheckin,
    Notification,
  ],
})
