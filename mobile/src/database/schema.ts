import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'profiles',
      columns: [
        { name: 'role', type: 'string' },
        { name: 'onboarding_completed', type: 'boolean' },
        { name: 'updated_at', type: 'number', isOptional: true },
        // other Supabase mirror fields
      ],
    }),
    tableSchema({
      name: 'daily_checkins',
      columns: [
        { name: 'athlete_id', type: 'string', isIndexed: true },
        { name: 'date', type: 'string' },
        { name: 'readiness_score', type: 'number' },
        { name: 'decision', type: 'string' },
        { name: 'synced_to_remote', type: 'boolean' }, // Local offline flag
      ],
    }),
    tableSchema({
      name: 'notifications',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'body', type: 'string' },
        { name: 'is_read', type: 'boolean' },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
})
