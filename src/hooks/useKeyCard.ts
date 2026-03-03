import { useState, useCallback } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { isDemoMode } from '@/lib/supabase';
import { useProperty } from './useProperty';
import type { Booking, Room } from '@/types';

// ============================================================
// Supported Key Card Providers
// ============================================================

export type KeyCardProvider = 'salto' | 'assa_abloy' | 'dormakaba' | 'onity' | '4suites' | 'none';

export interface KeyCardProviderInfo {
  id: KeyCardProvider;
  name: string;
  fullName: string;
  protocol: string;
  description: string;
  mobileKeySupport: boolean;
  cloudBased: boolean;
}

export const KEY_CARD_PROVIDERS: KeyCardProviderInfo[] = [
  {
    id: 'salto',
    name: 'SALTO',
    fullName: 'SALTO Systems',
    protocol: 'SALTO Space API / SALTO KS',
    description: 'Cloud-based access control. Supports BLE mobile keys, RFID cards, and PIN codes. Popular in boutique & mid-market hotels.',
    mobileKeySupport: true,
    cloudBased: true,
  },
  {
    id: 'assa_abloy',
    name: 'VingCard',
    fullName: 'ASSA ABLOY Global Solutions (VingCard)',
    protocol: 'Visionline / ASSA ABLOY Hospitality API',
    description: 'Industry-leading lock system. RFID/magstripe encoding via Visionline server. Mobile Access SDK available.',
    mobileKeySupport: true,
    cloudBased: false,
  },
  {
    id: 'dormakaba',
    name: 'Saflok',
    fullName: 'dormakaba (Saflok / Ilco)',
    protocol: 'Messenger / Ambiance API',
    description: 'Widely deployed legacy system. RFID & magstripe card encoding via Messenger server. Retrofit-friendly.',
    mobileKeySupport: false,
    cloudBased: false,
  },
  {
    id: 'onity',
    name: 'Onity',
    fullName: 'Onity (Allegion)',
    protocol: 'DirectKey / OnPortal API',
    description: 'Established brand with DirectKey mobile solution. Supports RFID, magstripe, and mobile credentials.',
    mobileKeySupport: true,
    cloudBased: false,
  },
  {
    id: '4suites',
    name: '4SUITES',
    fullName: '4SUITES by Assa Abloy',
    protocol: 'Cloud REST API',
    description: 'Modern cloud-native platform. Mobile-first with BLE smart locks. No on-site server required.',
    mobileKeySupport: true,
    cloudBased: true,
  },
];

// ============================================================
// Key Card Types
// ============================================================

export type KeyCardType = 'rfid' | 'magstripe' | 'mobile' | 'pin';
export type KeyStatus = 'active' | 'expired' | 'revoked' | 'lost';

export interface KeyCard {
  id: string;
  booking_id: string;
  room_id: string;
  room_number: string;
  card_type: KeyCardType;
  card_number: string;          // Unique card identifier / UID
  encoded_at: string;
  encoded_by: string;
  valid_from: string;
  valid_until: string;
  status: KeyStatus;
  is_master: boolean;
  guest_name: string;
  mobile_key_sent?: boolean;
  revoked_at?: string;
  revoked_by?: string;
  notes?: string;
}

export type EncodingStage = 'idle' | 'connecting' | 'authenticating' | 'encoding' | 'verifying' | 'success' | 'error';

export interface EncodingProgress {
  stage: EncodingStage;
  message: string;
  progress: number; // 0-100
  error?: string;
}

export interface KeyCardConfig {
  provider: KeyCardProvider;
  encoder_name: string;        // e.g. "Front Desk Encoder 1"
  server_host: string;         // e.g. "192.168.1.50" or "cloud.salto.com"
  server_port: string;
  api_key: string;
  auto_encode_on_checkin: boolean;
  default_card_type: KeyCardType;
  cards_per_booking: number;   // Default number of key cards
  include_common_areas: boolean; // Gym, pool, spa access
  mobile_key_enabled: boolean;
  send_mobile_key_sms: boolean;
}

// ============================================================
// Demo Configuration (persisted in query cache)
// ============================================================

const DEFAULT_CONFIG: KeyCardConfig = {
  provider: 'salto',
  encoder_name: 'Front Desk Encoder 1',
  server_host: '192.168.1.50',
  server_port: '8100',
  api_key: 'sk_live_••••••••••••••••',
  auto_encode_on_checkin: true,
  default_card_type: 'rfid',
  cards_per_booking: 1,
  include_common_areas: true,
  mobile_key_enabled: true,
  send_mobile_key_sms: false,
};

// Generate realistic card UID based on provider
function generateCardUID(provider: KeyCardProvider, cardType: KeyCardType): string {
  const hex = () => Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, '0');
  switch (cardType) {
    case 'rfid':
      return `${hex()}:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}`;
    case 'magstripe':
      return `MSG-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
    case 'mobile':
      return `MBK-${provider.toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    case 'pin':
      return `PIN-${Math.floor(1000 + Math.random() * 9000)}`;
    default:
      return `KEY-${hex()}${hex()}${hex()}`;
  }
}

// ============================================================
// Hook
// ============================================================

export function useKeyCard() {
  const { propertyId } = useProperty();
  const queryClient = useQueryClient();
  const [encodingProgress, setEncodingProgress] = useState<EncodingProgress>({ stage: 'idle', message: '', progress: 0 });
  const [isEncoding, setIsEncoding] = useState(false);

  // ── Config ─────────────────────────────────────────────────
  const configQuery = useQuery({
    queryKey: ['keycard-config', propertyId],
    queryFn: () => {
      if (isDemoMode) {
        return queryClient.getQueryData<KeyCardConfig>(['keycard-config', propertyId]) ?? DEFAULT_CONFIG;
      }
      return DEFAULT_CONFIG;
    },
    staleTime: Infinity,
  });

  const config = configQuery.data ?? DEFAULT_CONFIG;

  const updateConfig = useCallback((updates: Partial<KeyCardConfig>) => {
    const current = queryClient.getQueryData<KeyCardConfig>(['keycard-config', propertyId]) ?? DEFAULT_CONFIG;
    queryClient.setQueryData(['keycard-config', propertyId], { ...current, ...updates });
  }, [queryClient, propertyId]);

  // ── Key history per booking ────────────────────────────────
  const getKeysForBooking = useCallback((bookingId: string): KeyCard[] => {
    return queryClient.getQueryData<KeyCard[]>(['keycards', bookingId]) ?? [];
  }, [queryClient]);

  const getAllKeys = useCallback((): KeyCard[] => {
    const bookings = queryClient.getQueryData<Booking[]>(['bookings', propertyId]) ?? [];
    return bookings.flatMap(b => queryClient.getQueryData<KeyCard[]>(['keycards', b.id]) ?? []);
  }, [queryClient, propertyId]);

  // ── Master key storage ─────────────────────────────────────
  const getMasterKeys = useCallback((): KeyCard[] => {
    return queryClient.getQueryData<KeyCard[]>(['keycards', 'master']) ?? [];
  }, [queryClient]);

  const revokeMasterKey = useCallback((keyId: string) => {
    queryClient.setQueryData<KeyCard[]>(['keycards', 'master'], old =>
      (old ?? []).map(k =>
        k.id === keyId
          ? { ...k, status: 'revoked' as const, revoked_at: new Date().toISOString(), revoked_by: 'Management' }
          : k
      )
    );
  }, [queryClient]);

  // ── Simulated encoding process ─────────────────────────────
  const encodeKeyCard = useCallback(async (
    booking: Booking,
    room: Room,
    options?: {
      cardType?: KeyCardType;
      numCards?: number;
      isMaster?: boolean;
      sendMobileKey?: boolean;
    }
  ): Promise<KeyCard[]> => {
    const cardType = options?.cardType ?? config.default_card_type;
    const numCards = options?.numCards ?? config.cards_per_booking;
    const isMaster = options?.isMaster ?? false;
    const sendMobileKey = options?.sendMobileKey ?? (config.mobile_key_enabled && cardType === 'mobile');
    const provider = KEY_CARD_PROVIDERS.find(p => p.id === config.provider);
    const providerName = provider?.name ?? 'Key System';

    setIsEncoding(true);

    try {
      // Stage 1: Connecting
      setEncodingProgress({ stage: 'connecting', message: `Connecting to ${providerName} ${provider?.cloudBased ? 'cloud' : 'server'}…`, progress: 10 });
      await delay(600 + Math.random() * 400);

      // Stage 2: Authenticating
      setEncodingProgress({ stage: 'authenticating', message: `Authenticating with ${config.encoder_name}…`, progress: 30 });
      await delay(400 + Math.random() * 300);

      // Stage 3: Encoding (per card)
      const encodedCards: KeyCard[] = [];
      for (let i = 0; i < numCards; i++) {
        const cardLabel = numCards > 1 ? ` (card ${i + 1}/${numCards})` : '';
        setEncodingProgress({
          stage: 'encoding',
          message: cardType === 'mobile'
            ? `Generating mobile key credential${cardLabel}…`
            : `Encoding ${cardType.toUpperCase()} card for Room ${room.room_number}${cardLabel}…`,
          progress: 40 + (i / numCards) * 30,
        });
        await delay(800 + Math.random() * 600);

        const keyCard: KeyCard = {
          id: `kc-${booking.id}-${Date.now()}-${i}`,
          booking_id: booking.id,
          room_id: room.id,
          room_number: room.room_number,
          card_type: cardType,
          card_number: generateCardUID(config.provider, cardType),
          encoded_at: new Date().toISOString(),
          encoded_by: 'Reception',
          valid_from: booking.check_in,
          valid_until: `${booking.check_out}T${getCheckoutTime()}:00`,
          status: 'active',
          is_master: isMaster,
          guest_name: `${booking.guest?.first_name ?? ''} ${booking.guest?.last_name ?? ''}`.trim(),
          mobile_key_sent: sendMobileKey,
        };
        encodedCards.push(keyCard);
      }

      // Stage 4: Verifying
      setEncodingProgress({ stage: 'verifying', message: 'Verifying key access permissions…', progress: 80 });
      await delay(500 + Math.random() * 300);

      // Stage 5: Granting common area access
      if (config.include_common_areas) {
        setEncodingProgress({ stage: 'verifying', message: 'Granting common area access (gym, pool, spa)…', progress: 90 });
        await delay(300 + Math.random() * 200);
      }

      // Save to cache
      const cacheKey = isMaster ? 'master' : booking.id;
      const existingKeys = queryClient.getQueryData<KeyCard[]>(['keycards', cacheKey]) ?? [];
      queryClient.setQueryData(['keycards', cacheKey], [...existingKeys, ...encodedCards]);

      // Success
      setEncodingProgress({
        stage: 'success',
        message: cardType === 'mobile'
          ? `Mobile key sent to guest${sendMobileKey ? ' via SMS' : ''}`
          : `${numCards} key${numCards > 1 ? 's' : ''} encoded successfully — Room ${room.room_number}`,
        progress: 100,
      });
      await delay(300);

      return encodedCards;
    } catch (err) {
      setEncodingProgress({
        stage: 'error',
        message: 'Key encoding failed',
        progress: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      throw err;
    } finally {
      setIsEncoding(false);
    }
  }, [config, queryClient]);

  // ── Revoke a key ───────────────────────────────────────────
  const revokeKey = useCallback((bookingId: string, keyId: string) => {
    queryClient.setQueryData<KeyCard[]>(['keycards', bookingId], old =>
      (old ?? []).map(k =>
        k.id === keyId
          ? { ...k, status: 'revoked' as const, revoked_at: new Date().toISOString(), revoked_by: 'Reception' }
          : k
      )
    );
  }, [queryClient]);

  // ── Revoke all keys for a booking ──────────────────────────
  const revokeAllKeys = useCallback((bookingId: string) => {
    queryClient.setQueryData<KeyCard[]>(['keycards', bookingId], old =>
      (old ?? []).map(k =>
        k.status === 'active'
          ? { ...k, status: 'revoked' as const, revoked_at: new Date().toISOString(), revoked_by: 'System (checkout)' }
          : k
      )
    );
  }, [queryClient]);

  // ── Mark key as lost (and issue replacement) ───────────────
  const markKeyLost = useCallback((bookingId: string, keyId: string) => {
    queryClient.setQueryData<KeyCard[]>(['keycards', bookingId], old =>
      (old ?? []).map(k =>
        k.id === keyId
          ? { ...k, status: 'lost' as const, notes: 'Reported lost by guest' }
          : k
      )
    );
  }, [queryClient]);

  // ── Reset encoding state ───────────────────────────────────
  const resetEncoding = useCallback(() => {
    setEncodingProgress({ stage: 'idle', message: '', progress: 0 });
    setIsEncoding(false);
  }, []);

  // ── Encode a standalone staff master key ───────────────────
  const encodeMasterKey = useCallback(async (
    staffName: string,
    options?: { cardType?: KeyCardType; validDays?: number }
  ): Promise<KeyCard[]> => {
    const cardType = options?.cardType ?? config.default_card_type;
    const validDays = options?.validDays ?? 365;
    const provider = KEY_CARD_PROVIDERS.find(p => p.id === config.provider);
    const providerName = provider?.name ?? 'Key System';

    setIsEncoding(true);
    try {
      setEncodingProgress({ stage: 'connecting', message: `Connecting to ${providerName} ${provider?.cloudBased ? 'cloud' : 'server'}…`, progress: 10 });
      await delay(600 + Math.random() * 400);

      setEncodingProgress({ stage: 'authenticating', message: `Authenticating with ${config.encoder_name}…`, progress: 30 });
      await delay(400 + Math.random() * 300);

      setEncodingProgress({ stage: 'encoding', message: `Encoding MASTER ${cardType.toUpperCase()} key — all rooms access…`, progress: 55 });
      await delay(1000 + Math.random() * 600);

      const now = new Date();
      const validUntil = new Date(now.getTime() + validDays * 24 * 60 * 60 * 1000);

      const masterCard: KeyCard = {
        id: `mk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        booking_id: 'master',
        room_id: 'all',
        room_number: 'ALL',
        card_type: cardType,
        card_number: generateCardUID(config.provider, cardType),
        encoded_at: now.toISOString(),
        encoded_by: 'Management',
        valid_from: now.toISOString(),
        valid_until: validUntil.toISOString(),
        status: 'active',
        is_master: true,
        guest_name: staffName,
        notes: `Master key for ${staffName}`,
      };

      setEncodingProgress({ stage: 'verifying', message: 'Verifying master override access permissions…', progress: 80 });
      await delay(500 + Math.random() * 300);

      // Grant all access zones
      setEncodingProgress({ stage: 'verifying', message: 'Granting access to all rooms, common areas & back-of-house…', progress: 92 });
      await delay(400 + Math.random() * 200);

      // Save to master keys cache
      const existingMaster = queryClient.getQueryData<KeyCard[]>(['keycards', 'master']) ?? [];
      queryClient.setQueryData(['keycards', 'master'], [...existingMaster, masterCard]);

      setEncodingProgress({ stage: 'success', message: `Master key encoded for ${staffName} — all rooms access`, progress: 100 });
      await delay(300);

      return [masterCard];
    } catch (err) {
      setEncodingProgress({ stage: 'error', message: 'Master key encoding failed', progress: 0, error: err instanceof Error ? err.message : 'Unknown error' });
      throw err;
    } finally {
      setIsEncoding(false);
    }
  }, [config, queryClient]);

  return {
    config,
    updateConfig,
    providers: KEY_CARD_PROVIDERS,
    encodeKeyCard,
    encodeMasterKey,
    revokeKey,
    revokeAllKeys,
    markKeyLost,
    getKeysForBooking,
    getAllKeys,
    getMasterKeys,
    revokeMasterKey,
    encodingProgress,
    isEncoding,
    resetEncoding,
  };
}

// ============================================================
// Helpers
// ============================================================

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getCheckoutTime(): string {
  return '11:00'; // Default checkout time
}
