import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:gobuddy_mobile/main.dart';
import 'package:gobuddy_mobile/features/trips/presentation/screens/trip_detail_screen.dart';

import 'notification_payload_parser.dart';

/// Handles Firebase Cloud Messaging for push notifications.
///
/// This service:
/// - Requests notification permissions
/// - Gets and stores FCM tokens in Supabase
/// - Handles foreground, background, and terminated state messages
/// - Displays local notifications for foreground messages
class PushNotificationService {
  static final PushNotificationService _instance =
      PushNotificationService._internal();
  factory PushNotificationService() => _instance;
  PushNotificationService._internal();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  StreamSubscription<RemoteMessage>? _foregroundSubscription;
  String? _currentToken;
  String? _pendingTripId;

  /// Initialize the push notification service.
  /// Call this after Firebase.initializeApp() in main.dart.
  Future<void> init() async {
    // Request permission (iOS requires explicit permission)
    await _requestPermission();

    // Get FCM token and store it
    await _getAndStoreToken();

    // Listen for token refresh
    _messaging.onTokenRefresh.listen(_onTokenRefresh);

    // Initialize local notifications for foreground messages
    await _initLocalNotifications();

    // Handle foreground messages
    _foregroundSubscription = FirebaseMessaging.onMessage.listen(
      _handleForegroundMessage,
    );

    // Handle notification taps when app is in background
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

    // Check if app was opened from a notification (terminated state)
    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      _handleNotificationTap(initialMessage);
    }

    debugPrint('PushNotificationService initialized');
  }

  /// Request notification permissions from the user.
  Future<void> _requestPermission() async {
    final settings = await _messaging.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );

    debugPrint(
      'Notification permission status: ${settings.authorizationStatus}',
    );
  }

  /// Get the FCM token and store it in Supabase.
  Future<void> _getAndStoreToken() async {
    try {
      _currentToken = await _messaging.getToken();
      if (_currentToken != null) {
        if (kDebugMode) {
          debugPrint('FCM Token (debug): $_currentToken');
        }
        await _storeTokenInSupabase(_currentToken!);
        debugPrint('FCM Token obtained and stored');
      }
    } catch (e) {
      debugPrint('Error getting FCM token: $e');
    }
  }

  /// Handle token refresh events.
  void _onTokenRefresh(String newToken) {
    debugPrint('FCM Token refreshed');
    _currentToken = newToken;
    _storeTokenInSupabase(newToken);
  }

  /// Store the FCM token in Supabase push_tokens table.
  Future<void> _storeTokenInSupabase(String token) async {
    try {
      final userId = Supabase.instance.client.auth.currentUser?.id;
      if (userId == null) {
        debugPrint('Cannot store token: User not authenticated');
        return;
      }

      // Upsert the token (insert or update if exists)
      await Supabase.instance.client.from('push_tokens').upsert({
        'user_id': userId,
        'fcm_token': token,
        'platform': defaultTargetPlatform == TargetPlatform.iOS
            ? 'ios'
            : 'android',
        'updated_at': DateTime.now().toIso8601String(),
      }, onConflict: 'user_id, platform');

      debugPrint('FCM Token (debug): $token');
      debugPrint('FCM token stored in Supabase');
    } catch (e) {
      debugPrint('Error storing FCM token: $e');
    }
  }

  /// Initialize local notifications for displaying foreground messages.
  Future<void> _initLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings(
      '@mipmap/ic_launcher',
    );
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: false, // Already requested via FCM
      requestBadgePermission: false,
      requestSoundPermission: false,
    );

    await _localNotifications.initialize(
      settings: const InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      ),
      onDidReceiveNotificationResponse: _onLocalNotificationTap,
    );

    // Create notification channel for Android
    await _localNotifications
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.createNotificationChannel(
          const AndroidNotificationChannel(
            'gobuddy_push',
            'GoBuddy Notifications',
            description: 'Push notifications for GoBuddy Adventures',
            importance: Importance.high,
          ),
        );
  }

  /// Handle foreground messages by displaying a local notification.
  void _handleForegroundMessage(RemoteMessage message) {
    debugPrint('Received foreground message: ${message.messageId}');

    final notification = message.notification;
    if (notification != null) {
      _localNotifications.show(
        id: notification.hashCode,
        title: notification.title ?? 'GoBuddy Adventures',
        body: notification.body ?? '',
        notificationDetails: const NotificationDetails(
          android: AndroidNotificationDetails(
            'gobuddy_push',
            'GoBuddy Notifications',
            channelDescription: 'Push notifications for GoBuddy Adventures',
            importance: Importance.high,
            priority: Priority.high,
            icon: '@mipmap/ic_launcher',
          ),
          iOS: DarwinNotificationDetails(
            presentAlert: true,
            presentBadge: true,
            presentSound: true,
          ),
        ),
        payload: _extractTripId(message.data),
      );
    }
  }

  /// Handle notification taps (background/terminated state).
  void _handleNotificationTap(RemoteMessage message) {
    debugPrint('Notification tapped: ${message.messageId}');
    final tripId = _extractTripId(message.data);
    _handleTripNavigation(tripId);
  }

  /// Handle local notification taps (foreground state).
  void _onLocalNotificationTap(NotificationResponse response) {
    debugPrint('Local notification tapped: ${response.payload}');
    _handleTripNavigation(response.payload);
  }

  String? _extractTripId(Map<String, dynamic> data) {
    return NotificationPayloadParser.tripIdFromPayload(data);
  }

  void _handleTripNavigation(String? tripId) {
    if (tripId == null || tripId.isEmpty) {
      debugPrint('Notification missing trip_id; skipping navigation');
      return;
    }
    _navigateToTripDetail(tripId);
  }

  /// Helper to navigate to trip detail screen
  void _navigateToTripDetail(String tripId) {
    // navigate to the trip detail screen
    // We use the navigatorKey's currentState to push the new route
    // This allows navigation without a context reference in the service
    final navigatorState = GoBuddyApp.navigatorKey.currentState;

    if (navigatorState != null) {
      navigatorState.push(
        MaterialPageRoute(
          builder: (context) => TripDetailScreen(tripId: tripId),
        ),
      );
    } else {
      _pendingTripId = tripId;
      debugPrint('Navigator state is null, deferring navigation');
      WidgetsBinding.instance.addPostFrameCallback((_) {
        flushPendingNavigation();
      });
    }
  }

  /// Retry any deferred navigation once the navigator is ready.
  void flushPendingNavigation() {
    final pending = _pendingTripId;
    if (pending == null || pending.isEmpty) return;
    _pendingTripId = null;
    _navigateToTripDetail(pending);
  }

  /// Get the current FCM token (useful for debugging).
  String? get currentToken => _currentToken;

  /// Clean up when the service is no longer needed.
  void dispose() {
    _foregroundSubscription?.cancel();
  }
}

/// Background message handler - must be a top-level function.
/// This is called when a message is received while the app is in the background.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('Handling background message: ${message.messageId}');
  // Background messages are automatically displayed by the system
  // No additional handling needed for basic notifications
}
