import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/theme/app_theme.dart';
import '../screens/onboarding_screen.dart';

class OnboardingGuard extends StatefulWidget {
  final Widget child;

  const OnboardingGuard({super.key, required this.child});

  @override
  State<OnboardingGuard> createState() => _OnboardingGuardState();
}

class _OnboardingGuardState extends State<OnboardingGuard> {
  bool _loading = true;
  bool _isOnboarded = false;

  @override
  void initState() {
    super.initState();
    _checkOnboardingStatus();
  }

  Future<void> _checkOnboardingStatus() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) {
        // Should not happen if wrapped in AuthGuard properly, but safe fallback
        if (mounted) {
            setState(() {
                _loading = false;
                _isOnboarded = true; // Let downstream handle auth if needed
            });
        }
        return;
      }

      final response = await Supabase.instance.client
          .from('profiles')
          .select('onboarding_step')
          .eq('id', user.id)
          .maybeSingle();

      int step = 0;
      if (response != null && response['onboarding_step'] != null) {
        step = response['onboarding_step'] as int;
      }

      if (mounted) {
        setState(() {
          _isOnboarded = step >= 2; // Assumption: Step 2 = Complete (0=New, 1=Partial)
          _loading = false;
        });
      }
    } catch (e) {
      // In case of error (offline), default to showing content to avoid blocking user
      if (mounted) {
        setState(() {
          _isOnboarded = true;
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(
            color: AppTheme.primary,
          ),
        ),
      );
    }

    if (!_isOnboarded) {
      return OnboardingScreen(
        onOnboardingComplete: () {
          setState(() {
            _isOnboarded = true;
          });
        },
      );
    }

    return widget.child;
  }
}
