import { Model } from '@nozbe/watermelondb'
import { field, date, readonly } from '@nozbe/watermelondb/decorators'

export class Profile extends Model {
  static table = 'profiles'

  @field('role') role!: string
  @field('onboarding_completed') onboardingCompleted!: boolean
  @readonly @date('updated_at') updatedAt!: Date
}

export class DailyCheckin extends Model {
  static table = 'daily_checkins'

  @field('athlete_id') athleteId!: string
  @field('date') date!: string
  @field('readiness_score') readinessScore!: number
  @field('decision') decision!: string
  @field('synced_to_remote') syncedToRemote!: boolean
}

export class Notification extends Model {
  static table = 'notifications'

  @field('title') title!: string
  @field('body') body!: string
  @field('is_read') isRead!: boolean
  @readonly @date('created_at') createdAt!: Date
}
