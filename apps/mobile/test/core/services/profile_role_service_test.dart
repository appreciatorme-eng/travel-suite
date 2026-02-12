import 'package:flutter_test/flutter_test.dart';
import 'package:gobuddy_mobile/core/services/profile_role_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ProfileRoleService pending role storage', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    test('savePendingRole and getPendingRole round trip', () async {
      final service = ProfileRoleService();

      await service.savePendingRole('driver');
      final value = await service.getPendingRole();

      expect(value, 'driver');
    });

    test('clearPendingRole removes saved role', () async {
      final service = ProfileRoleService();

      await service.savePendingRole('client');
      await service.clearPendingRole();

      final value = await service.getPendingRole();
      expect(value, isNull);
    });
  });
}
