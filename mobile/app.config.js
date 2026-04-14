const fs = require('node:fs')
const path = require('node:path')

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((acc, line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return acc

      const separatorIndex = trimmed.indexOf('=')
      if (separatorIndex === -1) return acc

      const key = trimmed.slice(0, separatorIndex).trim()
      let value = trimmed.slice(separatorIndex + 1).trim()

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      acc[key] = value
      return acc
    }, {})
}

const rootEnv = readEnvFile(path.resolve(__dirname, '../.env.local'))

function resolveEnvValue(...keys) {
  for (const key of keys) {
    if (process.env[key]) return process.env[key]
    if (rootEnv[key]) return rootEnv[key]
  }

  return ''
}

module.exports = () => ({
  expo: {
    name: 'CREEDA Mobile',
    slug: 'creeda-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'creeda',
    userInterfaceStyle: 'dark',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.creeda.app',
    },
    android: {
      package: 'com.creeda.app',
    },
    plugins: [
      'expo-router',
      [
        'react-native-vision-camera',
        {
          cameraPermissionText: 'CREEDA needs camera access for on-device posture and video analysis.',
          enableFrameProcessors: true,
        },
      ],
      [
        'expo-build-properties',
        {
          android: {
            minSdkVersion: 26,
          },
        },
      ],
      'expo-health-connect',
      [
        '@kingstinct/react-native-healthkit',
        {
          NSHealthShareUsageDescription:
            'CREEDA reads Apple Health data like steps, sleep, heart rate, and HRV to personalize daily recovery guidance.',
          NSHealthUpdateUsageDescription:
            'CREEDA writes connection metadata so your health sync stays reliable across devices.',
          background: false,
        },
      ],
    ],
    extra: {
      supabaseUrl: resolveEnvValue('EXPO_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'),
      supabaseAnonKey: resolveEnvValue('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      apiBaseUrl: resolveEnvValue('EXPO_PUBLIC_API_BASE_URL', 'NEXT_PUBLIC_SITE_URL'),
    },
  },
})
