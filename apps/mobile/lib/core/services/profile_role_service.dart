import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ProfileRoleService {
  static const _pendingRoleKey = 'pending_profile_role';

  Future<void> savePendingRole(String role) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_pendingRoleKey, role);
  }

  Future<String?> getPendingRole() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_pendingRoleKey);
  }

  Future<void> clearPendingRole() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_pendingRoleKey);
  }

  Future<void> setRoleForCurrentUser(String role) async {
    final supabase = Supabase.instance.client;
    final user = supabase.auth.currentUser;
    if (user == null) return;

    await supabase.from('profiles').upsert({
      'id': user.id,
      'email': user.email,
      'role': role,
      'updated_at': DateTime.now().toIso8601String(),
    });
  }

  Future<void> applyPendingRoleForCurrentUser() async {
    final pendingRole = await getPendingRole();
    if (pendingRole == null || pendingRole.isEmpty) return;

    await setRoleForCurrentUser(pendingRole);
    await clearPendingRole();
  }
}
