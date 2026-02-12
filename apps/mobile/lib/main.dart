import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'firebase_options.dart';
import 'core/theme/app_theme.dart';
import 'core/config/supabase_config.dart';
import 'core/services/notification_service.dart';
import 'core/services/push_notification_service.dart';
import 'core/services/profile_role_service.dart';
import 'features/trips/presentation/screens/trips_screen.dart';
import 'features/auth/presentation/screens/auth_screen.dart';
import 'features/auth/presentation/widgets/onboarding_guard.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase first
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  // Set up background message handler
  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

  // Initialize Supabase
  await Supabase.initialize(
    url: SupabaseConfig.url,
    anonKey: SupabaseConfig.anonKey,
  );

  // Initialize local notifications (for non-push local alerts)
  await NotificationService().init();

  runApp(const ProviderScope(child: GoBuddyApp()));
}

class GoBuddyApp extends StatelessWidget {
  static final GlobalKey<NavigatorState> navigatorKey =
      GlobalKey<NavigatorState>();

  const GoBuddyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GoBuddy Adventures',
      navigatorKey: navigatorKey,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const AuthWrapper(),
    );
  }
}

class AuthWrapper extends StatefulWidget {
  const AuthWrapper({super.key});

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  bool _pushNotificationsInitialized = false;
  String? _lastRoleSyncUserId;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<AuthState>(
      stream: Supabase.instance.client.auth.onAuthStateChange,
      builder: (context, snapshot) {
        final session = snapshot.data?.session;

        if (session != null) {
          final userId = session.user.id;
          if (_lastRoleSyncUserId != userId) {
            _lastRoleSyncUserId = userId;
            ProfileRoleService().applyPendingRoleForCurrentUser();
          }

          // Initialize push notifications once user is authenticated
          // This ensures we can store the FCM token with the user ID
          if (!_pushNotificationsInitialized) {
            _pushNotificationsInitialized = true;
            PushNotificationService().init();
            PushNotificationService().flushPendingNavigation();
          }
          return OnboardingGuard(child: const TripsScreen());
        }

        // Reset flag when logged out so it reinitializes on next login
        _pushNotificationsInitialized = false;
        _lastRoleSyncUserId = null;
        return const AuthScreen();
      },
    );
  }
}
